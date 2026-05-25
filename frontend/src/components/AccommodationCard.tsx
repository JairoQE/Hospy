import { Link } from "react-router-dom";
import type { Ref } from "react";
import type { AccommodationListItem } from "../api/types";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { formatMoney, typeLabel } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";

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
  const { t, tVars } = useLocaleCurrency();
  const qs = new URLSearchParams();
  if (checkIn) qs.set("entrada", checkIn);
  if (checkOut) qs.set("salida", checkOut);
  const suffix = qs.toString() ? `?${qs}` : "";

  const rating = Number(item.average_rating) || 0;
  const fotoUrl = resolveMediaUrl(item.foto_principal);
  const hasDates = Boolean(checkIn && checkOut);

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
        {item.oferta_activa && (
          <span className="acc-card-offer">
            −{Number(item.descuento_porcentaje) || ""}%
          </span>
        )}
        <span className="acc-card-type">{typeLabel(item.type)}</span>
      </div>
      <div className="acc-card-body">
        <h3>{item.name}</h3>
        <p className="acc-card-meta">
          {item.city}
          {item.distance_km != null && (
            <> · {tVars("common.distanceKm", { km: item.distance_km })}</>
          )}
        </p>
        <div className="acc-card-footer">
          <span className="rating" title={`${rating} estrellas`}>
            ★ {rating > 0 ? rating.toFixed(1) : t("price.new")}
          </span>
          <span className={`price${hasDates ? " price--highlight" : ""}`}>
            {item.precio_desde != null ? (
              <>
                {hasDates ? `${t("price.totalFrom")} ` : `${t("price.from")} `}
                {item.oferta_activa && item.precio_desde_original != null && (
                  <span className="price-was">{formatMoney(item.precio_desde_original)}</span>
                )}
                <strong>{formatMoney(item.precio_desde)}</strong>
                {!hasDates && <span className="price-unit"> {t("price.perNight")}</span>}
              </>
            ) : (
              t("price.consult")
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
