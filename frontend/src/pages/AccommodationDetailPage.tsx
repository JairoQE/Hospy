import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import { AccommodationCard } from "../components/AccommodationCard";
import { ContactHostSection } from "../components/ContactHostSection";
import { OwnerStoreBanner } from "../components/owner/OwnerStoreBanner";
import { MapModal } from "../components/MapModal";
import { AccommodationFaqSection } from "../components/AccommodationFaqSection";
import { PhotoGallery } from "../components/PhotoGallery";
import { PropertyMap } from "../components/PropertyMap";
import type {
  AccommodationDetail,
  Paginated,
  PriceBreakdown,
  Review,
  RoomPublic,
} from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { DateRangePicker } from "../components/calendar/DateRangePicker";
import { recordRecentView } from "../hooks/useRecentlyViewed";
import { canInquireHost } from "../utils/hostChat";
import { formatDate, formatMoney, roomTypeLabel, todayPlusDays, typeLabel } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";
import { IconCheck, IconEye, IconMapPin, IconUser } from "../components/icons";
import { PrimeIcon } from "../components/PrimeIcon";
import { ratingLabel, ratingStars } from "../utils/rating";

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

export function AccommodationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { openChat } = useChatDock();
  const { t, tVars } = useLocaleCurrency();

  const entrada = searchParams.get("entrada") ?? "";
  const salida = searchParams.get("salida") ?? "";

  const [acc, setAcc] = useState<AccommodationDetail | null>(null);
  const [rooms, setRooms] = useState<RoomPublic[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [roomQuotes, setRoomQuotes] = useState<Record<number, PriceBreakdown | null>>({});
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);

  const [localEntrada, setLocalEntrada] = useState(entrada || todayPlusDays(7));
  const [localSalida, setLocalSalida] = useState(salida || todayPlusDays(9));

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
      hospedajeId: acc.id,
      hospedajeName: acc.name,
    });
    const next = new URLSearchParams(searchParams);
    next.delete("chat");
    setSearchParams(next, { replace: true });
  }, [searchParams, user?.role, acc, openChat, setSearchParams]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<AccommodationDetail>(`/hospedajes/${id}/`, false),
      api.get<RoomPublic[] | Paginated<RoomPublic>>(
        `/hospedajes/${id}/habitaciones/`,
        false,
      ),
      api.get<Review[] | Paginated<Review>>(`/hospedajes/${id}/resenas/`, false),
    ])
      .then(([a, r, rev]) => {
        setAcc(a);
        const roomList = unwrapList(r);
        const reviewList = unwrapList(rev);
        setRooms(roomList);
        setReviews(reviewList);
        if (roomList.length) setSelectedRoom(roomList[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

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

  const hasDates = Boolean(entrada && salida);

  useEffect(() => {
    if (!hasDates || rooms.length === 0) {
      setRoomQuotes({});
      return;
    }
    Promise.all(
      rooms.map((r) =>
        api
          .get<PriceBreakdown>(
            `/habitaciones/${r.id}/precio/?entrada=${entrada}&salida=${salida}`,
            false,
          )
          .then((q) => [r.id, q] as const)
          .catch(() => [r.id, null] as const),
      ),
    ).then((pairs) => {
      const map: Record<number, PriceBreakdown | null> = {};
      pairs.forEach(([rid, q]) => {
        map[rid] = q;
      });
      setRoomQuotes(map);
    });
  }, [entrada, salida, hasDates, rooms]);

  const applyDates = () => {
    const next = new URLSearchParams(searchParams);
    next.set("entrada", localEntrada);
    next.set("salida", localSalida);
    setSearchParams(next);
  };

  const lat = acc ? Number(acc.latitude) : 0;
  const lng = acc ? Number(acc.longitude) : 0;
  const score = acc ? Number(acc.average_rating) : 0;
  const stars = ratingStars(score);
  const topReview = reviews[0];

  const minPrice = useMemo(() => {
    if (hasDates) {
      const totals = Object.values(roomQuotes)
        .filter(Boolean)
        .map((q) => Number(q!.total));
      return totals.length ? Math.min(...totals) : null;
    }
    const bases = rooms.map((r) => Number(r.base_price));
    return bases.length ? Math.min(...bases) : null;
  }, [hasDates, roomQuotes, rooms]);

  const scrollTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBook = async (roomId?: number) => {
    const room = roomId ?? selectedRoom;
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/hospedajes/${id}` } } });
      return;
    }
    if (!isRole("huesped")) {
      setError(t("detail.guestsOnly"));
      return;
    }
    if (!room || !entrada || !salida) {
      setError(t("detail.pickRoomDates"));
      scrollTo("disponibilidad");
      return;
    }
    setBooking(true);
    setError("");
    try {
      await api.post("/reservas/", {
        room,
        check_in: entrada,
        check_out: salida,
      });
      setMsg(t("detail.bookingCreated"));
      setTimeout(() => navigate("/mis-reservas"), 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("detail.bookingFailed"));
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div className="container page page-loading">{t("detail.loading")}</div>;
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

        <header className="property-header">
          <div className="property-header-main">
            <div className="property-title-row">
              <h1>{acc.name}</h1>
              {stars > 0 && (
                <span className="property-stars" aria-label={`${stars} ${t("common.stars")}`}>
                  {"★".repeat(stars)}
                </span>
              )}
              <span className="property-type-badge">{typeLabel(acc.type)}</span>
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

      <div className="container property-gallery-wrap">
        <PhotoGallery fotos={acc.fotos ?? []} name={acc.name} />
      </div>

      {(acc.services ?? []).length > 0 && (
        <div className="container property-amenities-bar">
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
          <section className="property-section" id="descripcion">
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
                hospedajeId: acc.id,
                hospedajeName: acc.name,
              })
            }
          />

          <section className="property-section" id="disponibilidad">
            <div className="section-head-row">
              <h2>{t("detail.availability")}</h2>
              {minPrice != null && (
                <p className="price-from">
                  {t("detail.fromPrice")} <strong>{formatMoney(minPrice)}</strong>
                  {hasDates ? t("detail.perStay") : t("detail.perNight")}
                </p>
              )}
            </div>

            <div className="availability-search card availability-search--calendar">
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
              />
            </div>

            {!hasDates && (
              <p className="muted avail-hint">{t("detail.datesHint")}</p>
            )}

            <div className="availability-table-wrap">
              <table className="availability-table">
                <thead>
                  <tr>
                    <th>{t("detail.roomTypeCol")}</th>
                    <th>{t("detail.guests")}</th>
                    <th>{hasDates ? t("detail.priceStay") : t("detail.priceNight")}</th>
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
                              {t("detail.room")} {r.number} — {roomTypeLabel(r.type)}
                            </strong>
                            {r.description && (
                              <p className="room-desc">{r.description}</p>
                            )}
                            <ul className="room-features">
                              <li>{tVars("detail.capacity", { n: r.capacity })}</li>
                              {r.floor != null && <li>{tVars("detail.floor", { n: r.floor })}</li>}
                            </ul>
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
                            {price != null ? (
                              <>
                                <span className="room-price">{formatMoney(price)}</span>
                                {hasDates && quote && (
                                  <small>
                                    {quote.noches === 1
                                      ? tVars("detail.night", { n: quote.noches })
                                      : tVars("detail.nights", { n: quote.noches })}
                                  </small>
                                )}
                              </>
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
                              disabled={booking || !hasDates}
                              title={!hasDates ? t("detail.pickDatesHint") : undefined}
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
                                    <dt>{t("detail.basePriceNight")}</dt>
                                    <dd>{formatMoney(r.base_price)}</dd>
                                  </div>
                                  {hasDates && quote && (
                                    <div>
                                      <dt>{t("detail.stayPrice")}</dt>
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

          <section className="property-section" id="servicios">
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

          <AccommodationFaqSection
            propertyName={acc.name}
            faqs={acc.faqs ?? []}
          />

          <section className="property-section" id="resenas">
            <div className="section-head-row">
              <h2>{t("detail.reviewsTitle")}</h2>
              {reviews.length > 0 && (
                <span className="reviews-count">
                  {tVars("detail.reviewsCount", { n: reviews.length })}
                </span>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="muted">{t("detail.noReviews")}</p>
            ) : (
              <div className="reviews-grid">
                {reviews.slice(0, 6).map((r) => (
                  <article key={r.id} className="review-card">
                    <div className="review-score-pill">{r.rating}</div>
                    <p className="review-author">{r.autor_nombre}</p>
                    <p className="review-text">{r.comment}</p>
                    <time className="muted">{formatDate(r.created_at.slice(0, 10))}</time>
                  </article>
                ))}
              </div>
            )}
          </section>

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

          <section className="property-section" id="ubicacion">
            <h2>{t("detail.location")}</h2>
            <p className="muted">{fullAddress}</p>
            <PropertyMap
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
                «{topReview.comment.slice(0, 120)}
                {topReview.comment.length > 120 ? "…" : ""}»
                <cite>— {topReview.autor_nombre}</cite>
              </blockquote>
            )}
          </div>

          <div className="sidebar-card map-card">
            <PropertyMap
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

          <div className="sidebar-card book-card sticky-book">
            <h3>{t("detail.yourBooking")}</h3>
            {hasDates ? (
              <>
                <p>
                  {formatDate(entrada)} → {formatDate(salida)}
                </p>
                <label>
                  {t("detail.roomSelect")}
                  <select
                    value={selectedRoom ?? ""}
                    onChange={(e) => setSelectedRoom(Number(e.target.value))}
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
              disabled={booking || !rooms.length || !hasDates}
              title={!hasDates ? t("detail.pickDatesSidebar") : undefined}
              onClick={() => handleBook()}
            >
              {booking ? t("detail.booking") : t("detail.book")}
            </button>
            <p className="book-note muted">{t("detail.noChargeYet")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
