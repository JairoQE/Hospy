import { Link } from "react-router-dom";
import type { Ref } from "react";
import type { AccommodationListItem } from "../api/types";
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
        {!fotoUrl && <span className="acc-card-placeholder">Sin foto</span>}
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
          {item.distance_km != null && <> · A {item.distance_km} km de ti</>}
        </p>
        <div className="acc-card-footer">
          <span className="rating" title={`${rating} estrellas`}>
            ★ {rating > 0 ? rating.toFixed(1) : "Nuevo"}
          </span>
          <span className={`price${hasDates ? " price--highlight" : ""}`}>
            {item.precio_desde != null ? (
              <>
                {hasDates ? "Total desde " : "desde "}
                {item.oferta_activa && item.precio_desde_original != null && (
                  <span className="price-was">{formatMoney(item.precio_desde_original)}</span>
                )}
                <strong>{formatMoney(item.precio_desde)}</strong>
                {!hasDates && <span className="price-unit"> / noche</span>}
              </>
            ) : (
              "Consultar"
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
