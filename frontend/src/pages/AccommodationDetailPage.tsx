import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import {
  fetchAccommodationCotizacion,
  fetchDetailBootstrap,
  loadCachedDetailBootstrap,
} from "../api/detailBootstrap";
import { formatApiError } from "../api/errors";
import { AccommodationCard } from "../components/AccommodationCard";
import { ContactHostSection } from "../components/ContactHostSection";
import { OwnerStoreBanner } from "../components/owner/OwnerStoreBanner";
import { MapModal } from "../components/MapModal";
import { CancellationPolicySection } from "../components/bookings/CancellationPolicySection";
import { CheckInCheckOutPolicySection } from "../components/bookings/CheckInCheckOutPolicySection";
import { RefundPolicySection } from "../components/bookings/RefundPolicySection";
import { PaymentCheckoutModal } from "../components/payments/PaymentCheckoutModal";
import { AccommodationFaqSection } from "../components/AccommodationFaqSection";
import { PropertyOffersShowcase } from "../components/property/PropertyOffersShowcase";
import { PriceTrendSection } from "../components/property/PriceTrendSection";
import { PhotoGallery } from "../components/PhotoGallery";
import { LazyPropertyMap } from "../components/LazyPropertyMap";
import type {
  AccommodationDetail,
  AccommodationOffer,
  PriceBreakdown,
  Review,
  ReviewInsights,
  RoomPublic,
  Booking,
} from "../api/types";
import type { AccommodationDisplayPrices } from "../api/detailBootstrap";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { DateRangePicker } from "../components/calendar/DateRangePicker";
import { recordRecentView } from "../hooks/useRecentlyViewed";
import { canInquireHost } from "../utils/hostChat";
import { peerPublicProfilePath } from "../utils/peerProfilePath";
import { compareDateStr } from "../utils/calendarDates";
import { formatDate, formatMoney, roomTypeLabel, todayPlusDays, typeLabel } from "../utils/format";
import { useAccommodationCalendar } from "../hooks/useAccommodationCalendar";
import { getPricingModel, isWholeUnitPricing } from "../utils/pricingModel";
import { resolveMediaUrl } from "../utils/media";
import { IconCheck, IconEye, IconMapPin, IconUser } from "../components/icons";
import { PrimeIcon } from "../components/PrimeIcon";
import { PropertyReviewsSection } from "../components/reviews/PropertyReviewsSection";
import { StarRating } from "../components/StarRating";
import { SkeletonPropertyDetail } from "../components/ui/Skeleton";
import { ratingLabel, ratingStars, toTenPointScore } from "../utils/rating";

const SERVICE_ICONS: Record<string, string> = {
  wifi: "WiFi",
  "wifi-gratis": "WiFi",
  estacionamiento: "Parking",
  parking: "Parking",
  restaurante: "Restaurante",
  desayuno: "Desayuno",
  mascotas: "Mascotas",
  "aire-acondicionado": "A/C",
  piscina: "Piscina",
  lavanderia: "Lavandería",
};

function serviceIcon(slug: string, name: string): string {
  return SERVICE_ICONS[slug] ?? name.slice(0, 12);
}

function quoteBeforeDiscountTotal(quote: PriceBreakdown): number | null {
  if (!quote.offer_applied) return null;
  type NightRow = {
    price_before_discount?: string | number;
    price?: string | number;
    precio?: string | number;
  };
  const rows: NightRow[] =
    (quote as PriceBreakdown & { nights?: NightRow[] }).nights ??
    (quote.desglose as NightRow[] | undefined) ??
    [];
  if (!rows.length) return null;
  let total = 0;
  let hasDiscount = false;
  for (const row of rows) {
    const before = row.price_before_discount;
    if (before != null) {
      total += Number(before);
      hasDiscount = true;
    } else {
      total += Number(row.price ?? row.precio ?? 0);
    }
  }
  return hasDiscount ? total : null;
}

export function AccommodationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChat } = useChatDock();
  const { t, tVars } = useLocaleCurrency();

  const entrada = searchParams.get("entrada") ?? "";
  const salida = searchParams.get("salida") ?? "";

  const [acc, setAcc] = useState<AccommodationDetail | null>(null);
  const [rooms, setRooms] = useState<RoomPublic[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewInsights, setReviewInsights] = useState<ReviewInsights | null>(null);
  const [activeOffers, setActiveOffers] = useState<AccommodationOffer[]>([]);
  const [displayPrices, setDisplayPrices] = useState<AccommodationDisplayPrices | null>(null);
  const [roomQuotes, setRoomQuotes] = useState<Record<number, PriceBreakdown | null>>({});
  const [quoteErrors, setQuoteErrors] = useState<Record<number, string>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<{
    id: number;
    amount: string;
  } | null>(null);

  const [localEntrada, setLocalEntrada] = useState(entrada || todayPlusDays(7));
  const [localSalida, setLocalSalida] = useState(salida || todayPlusDays(9));

  const numericId = id && !Number.isNaN(Number(id)) ? Number(id) : undefined;
  const accommodationCalendar = useAccommodationCalendar(numericId);

  useEffect(() => {
    if (entrada) setLocalEntrada(entrada);
    if (salida) setLocalSalida(salida);
  }, [entrada, salida]);

  /** Sin fechas en la URL, aplica las predeterminadas para habilitar cotización y reserva. */
  useEffect(() => {
    if (!id || (entrada && salida)) return;
    const next = new URLSearchParams(searchParams);
    next.set("entrada", localEntrada || todayPlusDays(7));
    next.set("salida", localSalida || todayPlusDays(9));
    setSearchParams(next, { replace: true });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al abrir o cambiar hospedaje

  useEffect(() => {
    if (searchParams.get("chat") !== "1" || !canInquireHost(user?.role) || !acc) return;
    openChat({
      mode: "guest",
      peerName: acc.propietario_nombre || t("detail.hostDefault"),
      peerPhotoUrl: acc.propietario_foto_url,
      peerUserId: acc.propietario_id,
      peerProfilePath: peerPublicProfilePath(acc.propietario_id, "propietario"),
      hospedajeId: acc.id,
      hospedajeName: acc.name,
    });
    const next = new URLSearchParams(searchParams);
    next.delete("chat");
    setSearchParams(next, { replace: true });
  }, [searchParams, user?.role, acc, openChat, setSearchParams]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const applyBootstrap = (payload: {
      hospedaje: AccommodationDetail;
      habitaciones: RoomPublic[];
      resenas: Review[];
      ofertas_vigentes?: AccommodationOffer[];
      precios_display?: AccommodationDisplayPrices;
      resenas_insights?: ReviewInsights;
    }) => {
      if (cancelled) return;
      setAcc(payload.hospedaje);
      setRooms(payload.habitaciones);
      setReviews(payload.resenas);
      setReviewInsights(payload.resenas_insights ?? null);
      setActiveOffers(payload.ofertas_vigentes ?? []);
      setDisplayPrices(payload.precios_display ?? null);
      if (payload.habitaciones.length) {
        setSelectedRoom(payload.habitaciones[0].id);
      }
      setLoading(false);
    };

    const cached = loadCachedDetailBootstrap(id);
    if (cached) {
      applyBootstrap(cached);
    } else {
      setLoading(true);
    }

    fetchDetailBootstrap(id)
      .then(applyBootstrap)
      .catch((e) => {
        if (cancelled) return;
        if (cached) return;
        if (e instanceof ApiError && e.status === 404) {
          setError(
            user?.role === "propietario"
              ? t("detail.notPublicOwner")
              : t("detail.notPublicGuest"),
          );
        } else {
          setError(e instanceof Error ? e.message : "Error");
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user?.role, t]);

  useEffect(() => {
    if (!acc || !user?.id) return;
    const primary = acc.fotos?.find((f) => f.is_primary) ?? acc.fotos?.[0];
    recordRecentView(
      {
        id: acc.id,
        name: acc.name,
        city: acc.city,
        type: acc.type,
        foto_principal: primary ? primary.image_url ?? primary.image : null,
        average_rating: acc.average_rating,
        precio_desde: null,
      },
      user.id,
    );
  }, [acc, user?.id]);

  const effectiveEntrada = entrada || localEntrada;
  const effectiveSalida = salida || localSalida;
  const hasDates = Boolean(
    effectiveEntrada &&
      effectiveSalida &&
      compareDateStr(effectiveSalida, effectiveEntrada) > 0,
  );

  useEffect(() => {
    if (!id || !hasDates || rooms.length === 0) {
      setRoomQuotes({});
      setQuoteErrors({});
      setQuotesLoading(false);
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    fetchAccommodationCotizacion(id, effectiveEntrada, effectiveSalida)
      .then(({ cotizaciones }) => {
        if (cancelled) return;
        const map: Record<number, PriceBreakdown | null> = {};
        const errs: Record<number, string> = {};
        cotizaciones.forEach((q) => {
          const roomId = q.room_id;
          if (roomId == null) return;
          map[roomId] = q;
          if (q.available === false) {
            errs[roomId] =
              q.availability_message ?? "No disponible en esas fechas";
          }
        });
        setRoomQuotes(map);
        setQuoteErrors(errs);
      })
      .catch((e) => {
        if (cancelled) return;
        const message =
          e instanceof ApiError
            ? formatApiError(e.data)
            : "No se pudo calcular el precio";
        const errs: Record<number, string> = {};
        rooms.forEach((r) => {
          errs[r.id] = message;
        });
        setRoomQuotes({});
        setQuoteErrors(errs);
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, effectiveEntrada, effectiveSalida, hasDates, rooms]);

  const applyDates = (start: string, end: string) => {
    setLocalEntrada(start);
    setLocalSalida(end);
    const next = new URLSearchParams(searchParams);
    next.set("entrada", start);
    next.set("salida", end);
    setSearchParams(next);
  };

  const lat = acc ? Number(acc.latitude) : 0;
  const lng = acc ? Number(acc.longitude) : 0;
  const score = acc ? toTenPointScore(Number(acc.average_rating)) : 0;
  const stars = ratingStars(score);
  const topReview = reviews[0];
  const wholeUnit = acc ? isWholeUnitPricing(acc.type) : false;

  useEffect(() => {
    if (wholeUnit && rooms.length === 1 && selectedRoom !== rooms[0].id) {
      setSelectedRoom(rooms[0].id);
    }
  }, [wholeUnit, rooms, selectedRoom]);

  const minPrice = useMemo(() => {
    if (hasDates) {
      const totals = Object.values(roomQuotes)
        .filter((q) => q && q.available !== false)
        .map((q) => Number(q!.total));
      return totals.length ? Math.min(...totals) : null;
    }
    if (displayPrices?.precio_desde != null) {
      return Number(displayPrices.precio_desde);
    }
    const bases = rooms.map((r) => Number(r.base_price));
    return bases.length ? Math.min(...bases) : null;
  }, [hasDates, roomQuotes, rooms, displayPrices]);

  const minPriceOriginal = useMemo(() => {
    if (hasDates) return null;
    if (displayPrices?.precio_desde_original == null) return null;
    return Number(displayPrices.precio_desde_original);
  }, [hasDates, displayPrices]);

  const maxDiscountPercent = useMemo(() => {
    if (displayPrices?.descuento_porcentaje != null) {
      return Number(displayPrices.descuento_porcentaje);
    }
    if (!activeOffers.length) return null;
    return Math.max(...activeOffers.map((o) => Number(o.discount_percent) || 0));
  }, [displayPrices, activeOffers]);

  const scrollTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBook = async (roomId?: number) => {
    const room = roomId ?? selectedRoom;
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/hospedajes/${id}` } } });
      return;
    }
    const bookIn = entrada || localEntrada;
    const bookOut = salida || localSalida;
    if (!room || !bookIn || !bookOut || compareDateStr(bookOut, bookIn) <= 0) {
      setError(t("detail.pickRoomDates"));
      scrollTo("disponibilidad");
      return;
    }
    if (quoteErrors[room]) {
      setError(quoteErrors[room]);
      scrollTo("disponibilidad");
      return;
    }
    setBooking(true);
    setError("");
    try {
      const created = await api.post<Booking>("/reservas/", {
        room,
        check_in: bookIn,
        check_out: bookOut,
      });
      setCheckoutBooking({
        id: created.id,
        amount: String(created.total_amount),
      });
      setMsg("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("detail.bookingFailed"));
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <SkeletonPropertyDetail />;
  }
  if (!acc) {
    return (
      <div className="container page">
        <p className="error-msg">{error || t("detail.notFound")}</p>
        <Link to="/">{t("home.backHome")}</Link>
      </div>
    );
  }

  const fullAddress = `${acc.address}, ${acc.city}, ${acc.region}, ${acc.country}`;

  return (
    <div className="property-detail">
      <MapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        latitude={lat}
        longitude={lng}
        name={acc.name}
        address={fullAddress}
      />
      <div className="container">
        <nav className="property-breadcrumb">
          <Link to="/">{t("detail.home")}</Link>
          <span>/</span>
          <Link to={`/?ciudad=${encodeURIComponent(acc.city)}`}>{acc.city}</Link>
          <span>/</span>
          <span>{acc.name}</span>
        </nav>

        <header className="property-header" data-tour="property-header">
          <div className="property-header-main">
            <div className="property-title-row">
              <h1>{acc.name}</h1>
              {stars > 0 && (
                <span className="property-stars" aria-label={`${stars} ${t("common.stars")}`}>
                  {"★".repeat(stars)}
                </span>
              )}
              <span className="property-type-badge">{typeLabel(acc.type)}</span>
              {maxDiscountPercent != null && maxDiscountPercent > 0 && (
                <span className="property-offer-header-badge">
                  <PrimeIcon name="pi-tag" size={12} />
                  {tVars("detail.headerOfferBadge", {
                    percent: Number.isInteger(maxDiscountPercent)
                      ? maxDiscountPercent
                      : maxDiscountPercent.toFixed(0),
                  })}
                </span>
              )}
            </div>
            <p className="property-address-line">
              <IconMapPin size={18} className="pin-icon" />
              <a
                href="#ubicacion"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo("ubicacion");
                }}
              >
                {fullAddress}
              </a>
              <button type="button" className="link-btn" onClick={() => setMapOpen(true)}>
                · {t("detail.locationExcellent")}
              </button>
            </p>
          </div>
          <div className="property-header-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMapOpen(true)}>
              {t("detail.map")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => scrollTo("disponibilidad")}
            >
              {t("detail.bookNow")}
            </button>
          </div>
        </header>
      </div>

      <div className="container property-gallery-wrap" data-tour="property-gallery">
        <PhotoGallery fotos={acc.fotos ?? []} name={acc.name} />
      </div>

      {activeOffers.length > 0 && (
        <div className="container">
          <PropertyOffersShowcase
            offers={activeOffers}
            maxDiscountPercent={maxDiscountPercent}
            priceFrom={minPrice}
            priceFromOriginal={minPriceOriginal}
            onViewPrices={() => scrollTo("disponibilidad")}
          />
        </div>
      )}

      {(acc.services ?? []).length > 0 && (
        <div className="container property-amenities-bar" data-tour="property-amenities">
          {(acc.services ?? []).slice(0, 8).map((s) => (
            <span key={s.id} className="amenity-pill">
              <span className="amenity-icon">{serviceIcon(s.slug, s.name)}</span>
              {s.name}
            </span>
          ))}
        </div>
      )}

      <div className="container property-layout">
        <main className="property-main">
          <section className="property-section" id="descripcion" data-tour="property-description">
            <h2>{t("detail.about")}</h2>
            <p className="property-description">{acc.description}</p>
          </section>

          <OwnerStoreBanner accommodation={acc} />

          <ContactHostSection
            accommodation={acc}
            entrada={entrada}
            salida={salida}
            onOpenChat={() =>
              openChat({
                mode: "guest",
                peerName: acc.propietario_nombre || t("detail.hostDefault"),
                peerPhotoUrl: acc.propietario_foto_url,
                peerUserId: acc.propietario_id,
                peerProfilePath: peerPublicProfilePath(acc.propietario_id, "propietario"),
                hospedajeId: acc.id,
                hospedajeName: acc.name,
              })
            }
          />

          <section className="property-section" id="disponibilidad" data-tour="property-availability">
            <div className="section-head-row">
              <h2>{t("detail.availability")}</h2>
              {minPrice != null && (
                <p className="price-from">
                  {t("detail.fromPrice")}{" "}
                  {minPriceOriginal != null && minPriceOriginal > minPrice && (
                    <span className="price-from-old">{formatMoney(minPriceOriginal)}</span>
                  )}
                  <strong>{formatMoney(minPrice)}</strong>
                  {hasDates
                    ? wholeUnit
                      ? t("detail.perStay")
                      : t("detail.perRoomTotal")
                    : t("detail.perNight")}
                </p>
              )}
            </div>

            <div className="availability-search card availability-search--calendar">
              <p className="availability-calendar-mode muted">
                {wholeUnit ? t("calendar.modePerUnit") : t("calendar.modePerRoom")}
              </p>
              <DateRangePicker
                startDate={localEntrada}
                endDate={localSalida}
                minDate={todayPlusDays(0)}
                onChange={(start, end) => {
                  setLocalEntrada(start);
                  setLocalSalida(end);
                }}
                onApply={applyDates}
                applyLabel={t("detail.viewPrices")}
                showPresets
                marketingHint={t("calendar.stayDiscountHint")}
                dayStatuses={accommodationCalendar.daysByDate}
                pricingModel={
                  accommodationCalendar.pricingModel ??
                  (acc ? getPricingModel(acc.type) : "per_room")
                }
                onCalendarViewChange={accommodationCalendar.ensureMonths}
                showAvailabilityLegend
              />
            </div>

            {!hasDates && (
              <p className="muted avail-hint">{t("detail.datesHint")}</p>
            )}

            <div className="availability-table-wrap" data-tour="property-rooms">
              <table className="availability-table">
                <thead>
                  <tr>
                    <th>{wholeUnit ? t("detail.wholeUnitCol") : t("detail.roomTypeCol")}</th>
                    <th>{t("detail.guests")}</th>
                    <th>
                      {hasDates
                        ? wholeUnit
                          ? t("detail.priceStay")
                          : t("detail.priceRoomTotal")
                        : t("detail.priceNight")}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        {t("detail.noRooms")}
                      </td>
                    </tr>
                  )}
                  {rooms.map((r) => {
                    const quote = roomQuotes[r.id];
                    const unavailable = Boolean(hasDates && quoteErrors[r.id]);
                    const price = hasDates
                      ? quote?.total
                      : r.base_price;
                    const expanded = expandedRoomId === r.id;
                    const fotos = r.fotos ?? [];
                    return (
                      <Fragment key={r.id}>
                        <tr>
                          <td>
                            <strong>
                              {wholeUnit
                                ? t("detail.wholeUnitName")
                                : `${t("detail.room")} ${r.number} — ${roomTypeLabel(r.type)}`}
                            </strong>
                            {r.description && (
                              <p className="room-desc">{r.description}</p>
                            )}
                            <ul className="room-features">
                              <li>{tVars("detail.capacity", { n: r.capacity })}</li>
                              {r.floor != null && <li>{tVars("detail.floor", { n: r.floor })}</li>}
                            </ul>
                            {(r.services ?? []).length > 0 && (
                              <ul className="room-services-tags" aria-label={t("detail.roomServices")}>
                                {(r.services ?? []).map((s) => (
                                  <li key={s.id}>{s.name}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="capacity-cell">
                            <span
                              className="capacity-icons"
                              aria-label={`${r.capacity} ${r.capacity === 1 ? t("detail.person") : t("detail.persons")}`}
                            >
                              {Array.from(
                                { length: Math.min(r.capacity, 4) },
                                (_, i) => (
                                  <IconUser key={i} size={18} className="capacity-icon" />
                                ),
                              )}
                              {r.capacity > 4 && (
                                <span className="capacity-more">+{r.capacity - 4}</span>
                              )}
                            </span>
                          </td>
                          <td className="price-cell">
                            {quotesLoading ? (
                              <span className="muted">Calculando…</span>
                            ) : price != null ? (
                              <div className={quote?.offer_applied ? "room-price--offer" : undefined}>
                                {quote?.offer_applied && quoteBeforeDiscountTotal(quote) != null && (
                                  <span className="room-price-before">
                                    {formatMoney(quoteBeforeDiscountTotal(quote)!)}
                                  </span>
                                )}
                                <span className="room-price room-price--total">
                                  {formatMoney(price)}
                                </span>
                                {quote?.offer_applied && (
                                  <span className="room-price-offer-tag">
                                    <PrimeIcon name="pi-tag" size={11} />
                                    {t("detail.offerApplied")}
                                  </span>
                                )}
                                {hasDates && unavailable && (
                                  <small className="room-price-unavailable-hint">
                                    {quoteErrors[r.id]}
                                  </small>
                                )}
                                {hasDates && quote && !unavailable && (
                                  <small className="room-price-nights">
                                    {(quote.noches ??
                                      (quote as PriceBreakdown & { nights_count?: number })
                                        .nights_count) === 1
                                      ? tVars("detail.night", {
                                          n:
                                            quote.noches ??
                                            (quote as PriceBreakdown & { nights_count?: number })
                                              .nights_count ??
                                            1,
                                        })
                                      : tVars("detail.nights", {
                                          n:
                                            quote.noches ??
                                            (quote as PriceBreakdown & { nights_count?: number })
                                              .nights_count ??
                                            0,
                                        })}
                                    {wholeUnit && (
                                      <>
                                        {" "}
                                        · {t("detail.totalForStay")}
                                      </>
                                    )}
                                  </small>
                                )}
                              </div>
                            ) : unavailable ? (
                              <span className="room-price-unavailable" title={quoteErrors[r.id]}>
                                {quoteErrors[r.id]}
                              </span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="room-book-cell">
                            <button
                              type="button"
                              className={`btn btn-ghost btn-sm btn-room-eye${expanded ? " is-active" : ""}`}
                              aria-expanded={expanded}
                              aria-controls={`room-detail-${r.id}`}
                              title={
                                expanded ? t("detail.hideDetail") : t("detail.viewDetailPhotos")
                              }
                              onClick={() =>
                                setExpandedRoomId(expanded ? null : r.id)
                              }
                            >
                              <IconEye size={18} className="room-eye-icon" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={
                                booking ||
                                !hasDates ||
                                unavailable ||
                                Boolean(checkoutBooking)
                              }
                              title={
                                !hasDates
                                  ? t("detail.pickDatesHint")
                                  : unavailable
                                    ? quoteErrors[r.id]
                                    : undefined
                              }
                              onClick={() => {
                                setSelectedRoom(r.id);
                                handleBook(r.id);
                              }}
                            >
                              {t("detail.reserve")}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="room-detail-expand-row" id={`room-detail-${r.id}`}>
                            <td colSpan={4}>
                              <div className="room-detail-expand">
                                <h4 className="room-detail-expand-title">
                                  {t("detail.room")} {r.number}
                                </h4>
                                <dl className="room-detail-dl">
                                  <div>
                                    <dt>{t("detail.type")}</dt>
                                    <dd>{roomTypeLabel(r.type)}</dd>
                                  </div>
                                  <div>
                                    <dt>{t("detail.capacityLabel")}</dt>
                                    <dd>{tVars("detail.capacityPersons", { n: r.capacity })}</dd>
                                  </div>
                                  <div>
                                    <dt>{t("detail.floorLabel")}</dt>
                                    <dd>{r.floor != null ? r.floor : "—"}</dd>
                                  </div>
                                  <div>
                                    <dt>{wholeUnit ? t("detail.priceNight") : t("detail.basePriceNight")}</dt>
                                    <dd>{formatMoney(r.base_price)}</dd>
                                  </div>
                                  {hasDates && quote && wholeUnit && (
                                    <div>
                                      <dt>{t("detail.totalForStayLabel")}</dt>
                                      <dd>{formatMoney(quote.total)}</dd>
                                    </div>
                                  )}
                                </dl>
                                <div className="room-detail-desc">
                                  <strong>{t("detail.description")}</strong>
                                  <p>
                                    {r.description?.trim()
                                      ? r.description
                                      : t("detail.noDescription")}
                                  </p>
                                </div>
                                {(r.services ?? []).length > 0 && (
                                  <div className="room-detail-services">
                                    <strong>{t("detail.roomServices")}</strong>
                                    <ul className="services-grid room-detail-services-grid" role="list">
                                      {(r.services ?? []).map((s) => (
                                        <li key={s.id} className="service-item">
                                          <PrimeIcon
                                            name="pi-check"
                                            className="service-check"
                                            size={14}
                                            aria-hidden
                                          />
                                          <span>{s.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {fotos.length > 0 ? (
                                  <div className="room-detail-photos">
                                    <strong>{t("detail.photos")}</strong>
                                    <div className="room-detail-photo-strip">
                                      {fotos.map((f) => {
                                        const src = resolveMediaUrl(
                                          f.image_url ?? f.image,
                                        );
                                        if (!src) return null;
                                        return (
                                          <a
                                            key={f.id}
                                            href={src}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="room-detail-photo-link"
                                          >
                                            <img src={src} alt="" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="muted room-detail-no-photos">
                                    {t("detail.noRoomPhotos")}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {error && <p className="error-msg">{error}</p>}
            {msg && <p className="success-msg">{msg}</p>}
          </section>

          <PriceTrendSection
            accommodationId={acc.id}
            checkIn={effectiveEntrada}
            checkOut={effectiveSalida}
          />

          <section className="property-section" id="servicios" data-tour="property-services">
            <h2>{tVars("detail.servicesOf", { name: acc.name })}</h2>
            {score > 0 && (
              <p className="muted services-score">
                {t("detail.overallScore")} <strong>{score.toFixed(1)}</strong>
              </p>
            )}
            <ul className="services-grid" role="list">
              {(acc.services ?? []).map((s) => (
                <li key={s.id} className="service-item">
                  <PrimeIcon name="pi-check" className="service-check" size={14} aria-hidden />
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
            {(acc.services ?? []).length === 0 && (
              <p className="muted">{t("detail.noServices")}</p>
            )}
          </section>

          <div data-tour="property-policies">
          <CheckInCheckOutPolicySection
            checkInFrom={acc.check_in_from}
            checkOutUntil={acc.check_out_until}
            checkInInstructions={acc.check_in_instructions}
            checkOutInstructions={acc.check_out_instructions}
          />

          <CancellationPolicySection ownerNotes={acc.cancellation_policy_notes} />

          <RefundPolicySection
            policyType={acc.refund_policy_type}
            bullets={acc.refund_policy_bullets}
          />
          </div>

          <AccommodationFaqSection
            propertyName={acc.name}
            faqs={acc.faqs ?? []}
          />

          <PropertyReviewsSection
            reviews={reviews}
            insights={reviewInsights}
            city={acc.city}
          />

          {(acc.otros_mismo_propietario?.length ?? 0) > 0 && (
            <section className="property-section owner-more-section" id="mismo-propietario">
              <h2>
                {tVars("detail.moreFromHost", {
                  name: acc.propietario_nombre || t("detail.hostDefault"),
                })}
              </h2>
              <div className="owner-more-scroll" role="list">
                {acc.otros_mismo_propietario.map((item) => (
                  <div key={item.id} className="owner-more-card-wrap" role="listitem">
                    <AccommodationCard
                      item={item}
                      checkIn={entrada || undefined}
                      checkOut={salida || undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="property-section" id="ubicacion" data-tour="property-location">
            <h2>{t("detail.location")}</h2>
            <p className="muted">{fullAddress}</p>
            <LazyPropertyMap
              latitude={lat}
              longitude={lng}
              name={acc.name}
              address={fullAddress}
              className="property-map-large"
            />
            <button type="button" className="btn btn-ghost" onClick={() => setMapOpen(true)}>
              {t("detail.viewLargeMap")}
            </button>
          </section>
        </main>

        <aside className="property-sidebar">
          <div className="sidebar-card score-card">
            {score > 0 ? (
              <>
                <div className="score-text">
                  <strong>{ratingLabel(score)}</strong>
                  <p className="muted">
                    {reviews.length > 0
                      ? tVars("detail.reviewsCount", { n: reviews.length })
                      : t("detail.noCommentsYet")}
                  </p>
                </div>
                <div className="score-box">{score.toFixed(1)}</div>
              </>
            ) : (
              <p className="muted">{t("detail.noRatings")}</p>
            )}
            {topReview && (
              <blockquote className="featured-review">
                <StarRating rating={Number(topReview.rating)} size="sm" showValue={false} />
                <p>
                  «{topReview.comment.slice(0, 120)}
                  {topReview.comment.length > 120 ? "…" : ""}»
                </p>
                <cite>— {topReview.autor_nombre}</cite>
              </blockquote>
            )}
          </div>

          <div className="sidebar-card map-card">
            <LazyPropertyMap
              latitude={lat}
              longitude={lng}
              name={acc.name}
              className="property-map-sidebar"
            />
            <button type="button" className="map-overlay-btn" onClick={() => setMapOpen(true)}>
              {t("detail.viewOnMap")}
            </button>
          </div>

          <div className="sidebar-card highlights-card">
            <h3>{t("detail.highlights")}</h3>
            <ul>
              <li className="highlight-with-icon">
                <IconMapPin size={16} className="highlight-icon" />
                {acc.city}, {acc.region}
              </li>
              {(acc.services ?? []).slice(0, 3).map((s) => (
                <li key={s.id} className="highlight-with-icon">
                  <IconCheck size={16} className="highlight-icon highlight-icon-check" />
                  {s.name}
                </li>
              ))}
              {minPrice != null && (
                <li>
                  {t("detail.fromPrice")} <strong>{formatMoney(minPrice)}</strong>
                </li>
              )}
            </ul>
          </div>

          <div className="sidebar-card book-card sticky-book" data-tour="property-sidebar-book">
            <h3>{t("detail.yourBooking")}</h3>
            {hasDates ? (
              <>
                <p>
                  {formatDate(entrada)} → {formatDate(salida)}
                </p>
                <label>
                  {wholeUnit ? t("detail.wholeUnitSelect") : t("detail.roomSelect")}
                  <select
                    value={selectedRoom ?? ""}
                    onChange={(e) => setSelectedRoom(Number(e.target.value))}
                    disabled={wholeUnit && rooms.length <= 1}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {tVars("detail.roomOption", {
                          number: r.number,
                          capacity: r.capacity,
                        })}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRoom && roomQuotes[selectedRoom] && (
                  <p className="book-total">
                    {t("detail.total")}{" "}
                    <strong>{formatMoney(roomQuotes[selectedRoom]!.total)}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="muted">{t("detail.selectDatesSidebar")}</p>
            )}
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={
                booking ||
                !rooms.length ||
                !hasDates ||
                Boolean(checkoutBooking)
              }
              title={!hasDates ? t("detail.pickDatesSidebar") : undefined}
              onClick={() => handleBook()}
            >
              {booking ? t("detail.booking") : t("detail.book")}
            </button>
            <p className="book-note muted">
              Al reservar podrás pagar en línea (Yape, tarjeta) o coordinar pago directo con el
              anfitrión.
            </p>
          </div>
        </aside>
      </div>
      {checkoutBooking && acc && (
        <PaymentCheckoutModal
          bookingId={checkoutBooking.id}
          amount={checkoutBooking.amount}
          accommodationName={acc.name}
          onClose={() => setCheckoutBooking(null)}
          onPaid={() => {
            setCheckoutBooking(null);
            setMsg("Reserva pagada y confirmada.");
            navigate("/mis-reservas");
          }}
          onContactHost={() => {
            openChat({
              mode: "guest",
              peerName: acc.propietario_nombre || t("detail.hostDefault"),
              peerPhotoUrl: acc.propietario_foto_url,
              peerUserId: acc.propietario_id,
              peerProfilePath: peerPublicProfilePath(acc.propietario_id, "propietario"),
              hospedajeId: acc.id,
              hospedajeName: acc.name,
            });
          }}
        />
      )}
    </div>
  );
}
