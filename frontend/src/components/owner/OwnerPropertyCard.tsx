import { Link } from "react-router-dom";
import type { AccommodationListItem } from "../../api/types";
import { formatDate, typeLabel } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";
import { ownerCalendarPath } from "../../utils/ownerPanelRoutes";
import type { PropertyStats } from "../../utils/ownerPropertyStats";
import { PrimeIcon } from "../PrimeIcon";
import { OwnerPropertyStatusPill } from "./OwnerPropertyStatusPill";

type Props = {
  property: AccommodationListItem;
  stats: PropertyStats;
};

function parseRating(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function OwnerPropertyCard({ property, stats }: Props) {
  const imageUrl = resolveMediaUrl(property.foto_principal);
  const rating = parseRating(property.average_rating);
  const paused = property.is_active === false && property.status === "aprobado";

  return (
    <article className="owner-property-card">
      <div className="owner-property-card-body">
        <div className="owner-property-card-thumb">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="owner-property-card-thumb-placeholder" aria-hidden>
              <PrimeIcon name="pi-camera" size={28} />
            </span>
          )}
        </div>

        <div className="owner-property-card-main">
          <div className="owner-property-card-head">
            <h3 className="owner-property-card-title">{property.name}</h3>
            {property.status && <OwnerPropertyStatusPill status={property.status} />}
          </div>
          <p className="owner-property-card-location">
            <PrimeIcon name="pi-map-marker" size={16} />
            <span>
              {[property.city, typeLabel(property.type)].filter(Boolean).join(" · ")}
            </span>
          </p>

          <ul className="owner-property-card-metrics" aria-label="Métricas">
            {stats.confirmedThisMonth > 0 && (
              <li>
                <PrimeIcon name="pi-calendar" size={16} />
                {stats.confirmedThisMonth}{" "}
                {stats.confirmedThisMonth === 1 ? "reserva" : "reservas"} este mes
              </li>
            )}
            {rating > 0 && (
              <li>
                <PrimeIcon name="pi-star-fill" size={16} />
                {rating.toFixed(1)}
              </li>
            )}
            {stats.nextReservation && (
              <li>
                <PrimeIcon name="pi-clock" size={16} />
                Próxima: {formatDate(stats.nextReservation)}
              </li>
            )}
            {paused && (
              <li className="owner-property-card-metrics-muted">Pausado</li>
            )}
          </ul>
        </div>

        <div className="owner-property-card-actions">
          <Link
            to={`/panel/hospedajes/${property.id}`}
            className="owner-property-btn owner-property-btn--outline"
          >
            <PrimeIcon name="pi-pencil" size={18} />
            Editar
          </Link>
          <Link
            to={ownerCalendarPath(property.id)}
            className="owner-property-btn owner-property-btn--calendar"
          >
            <PrimeIcon name="pi-calendar" size={18} />
            Calendario
          </Link>
          <Link
            to={`/hospedajes/${property.id}`}
            className="owner-property-btn owner-property-btn--primary"
          >
            Ver ficha
            <PrimeIcon name="pi-arrow-right" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
