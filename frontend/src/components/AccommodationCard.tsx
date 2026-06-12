import { TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import type { Ref } from "react";
import type { AccommodationListItem } from "../api/types";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { formatMoney, formatStayDateRange } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";
import { ratingLabel, toTenPointScore } from "../utils/rating";
import { IconChevronRight } from "./icons";

interface Props {
  item: AccommodationListItem;
  checkIn?: string;
  checkOut?: string;
  compact?: boolean;
  cardRef?: Ref<HTMLAnchorElement>;
}

export function AccommodationCard({
  item,
  checkIn,
  checkOut,
  compact = false,
  cardRef,
}: Props) {
  const { t, tVars, language } = useLocaleCurrency();
  const qs = new URLSearchParams();
  if (checkIn) qs.set("entrada", checkIn);
  if (checkOut) qs.set("salida", checkOut);
  const suffix = qs.toString() ? `?${qs}` : "";

  const rawRating = Number(item.average_rating) || 0;
  const score = toTenPointScore(rawRating);
  const reviewsCount = item.reviews_count ?? 0;
  const fotoUrl = resolveMediaUrl(item.foto_principal);
  const dateRange = formatStayDateRange(checkIn, checkOut, { language });

  const priceCurrent =
    item.precio_desde != null ? Number(item.precio_desde) : null;
  const priceOriginal =
    item.precio_desde_original != null ? Number(item.precio_desde_original) : null;
  const priceDrop =
    item.oferta_activa && priceOriginal != null && priceCurrent != null
      ? priceOriginal - priceCurrent
      : null;

  const country = item.country || t("common.peru");
  const locationLabel =
    item.region && item.region !== item.city
      ? `${item.city}, ${item.region}, ${country}`
      : `${item.city}, ${country}`;

  return (
    <Link
      ref={cardRef}
      to={`/hospedajes/${item.id}${suffix}`}
      className={`acc-card${compact ? " acc-card--compact" : ""}`}
    >
      <div
        className="acc-card-image"
        style={fotoUrl ? { backgroundImage: `url(${fotoUrl})` } : undefined}
      >
        {!fotoUrl && <span className="acc-card-placeholder">{t("common.noPhoto")}</span>}
      </div>

      <div className="acc-card-body">
        <h3 className="acc-card-title">{item.name}</h3>
        <p className="acc-card-location">
          {locationLabel}
          {item.distance_km != null && (
            <span className="acc-card-distance">
              {" "}
              · {tVars("common.distanceKm", { km: item.distance_km })}
            </span>
          )}
        </p>

        {score > 0 && (
          <div className="acc-card-rating-row">
            <span className="acc-card-score-badge">{score.toFixed(1)}</span>
            <span className="acc-card-rating-text">
              <strong>{ratingLabel(score, language)}</strong>
              {reviewsCount > 0 && (
                <span className="acc-card-reviews">
                  ({reviewsCount.toLocaleString()})
                </span>
              )}
            </span>
          </div>
        )}

        {priceDrop != null && priceDrop > 0 && (
          <div className="acc-card-drop-badge">
            <TrendingDown size={14} strokeWidth={2.5} aria-hidden />
            {tVars("card.priceDropped", { price: formatMoney(priceDrop, { language }) })}
          </div>
        )}

        <div className="acc-card-price-row">
          <div className="acc-card-price-block">
            {priceCurrent != null ? (
              <p className="acc-card-price-main">
                <strong>{formatMoney(priceCurrent, { language })}</strong>
                <span className="acc-card-price-unit">{t("price.perNight")}</span>
              </p>
            ) : (
              <p className="acc-card-price-main acc-card-price-main--muted">
                {t("price.consult")}
              </p>
            )}
            {dateRange && <p className="acc-card-dates">{dateRange}</p>}
          </div>
          <span className="acc-card-action" aria-hidden>
            <IconChevronRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
