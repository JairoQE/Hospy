import { Link } from "react-router-dom";
import type { OwnerStoreListingItem } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney, typeLabel } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";

const SERVICE_ICONS: Record<string, string> = {
  wifi: "pi-wifi",
  "wifi-gratis": "pi-wifi",
  estacionamiento: "pi-car",
  parking: "pi-car",
};

type Props = {
  item: OwnerStoreListingItem;
};

function isNewListing(createdAt?: string): boolean {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export function OwnerStorePropertyCard({ item }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const fotoUrl = resolveMediaUrl(item.foto_principal);
  const rating = Number(item.average_rating) || 0;
  const isNew = isNewListing(item.created_at);
  const location = [item.city, item.region].filter(Boolean).join(", ");

  return (
    <article className="owner-store-property-card">
      <Link to={`/hospedajes/${item.id}`} className="owner-store-property-link">
        <div
          className="owner-store-property-image"
          style={fotoUrl ? { backgroundImage: `url(${fotoUrl})` } : undefined}
        >
          {!fotoUrl && <span className="owner-store-property-placeholder">{t("common.noPhoto")}</span>}
          {isNew && rating < 1 && (
            <span className="owner-store-badge owner-store-badge--new">{t("ownerStorePage.badgeNew")}</span>
          )}
          {item.oferta_activa && (
            <span className="owner-store-badge owner-store-badge--offer">
              −{Number(item.descuento_porcentaje) || ""}%
            </span>
          )}
        </div>
        <div className="owner-store-property-body">
          <span className="owner-store-property-type">{typeLabel(item.type)}</span>
          <h3 className="owner-store-property-title">{item.name}</h3>
          {location && (
            <p className="owner-store-property-location">
              <PrimeIcon name="pi-map-marker" size={14} />
              {location}
            </p>
          )}
          <div className="owner-store-property-features">
            {item.max_capacity != null && item.max_capacity > 0 && (
              <span>
                <PrimeIcon name="pi-users" size={14} />
                {tVars("ownerStorePage.guests", { n: item.max_capacity })}
              </span>
            )}
            {(item.services_preview ?? []).slice(0, 3).map((s) => (
              <span key={s.slug} title={s.name}>
                <PrimeIcon name={SERVICE_ICONS[s.slug] ?? "pi-check"} size={14} />
                {s.name}
              </span>
            ))}
          </div>
          <div className="owner-store-property-footer">
            <span className="owner-store-property-rating">
              {rating > 0 ? (
                <>
                  <PrimeIcon name="pi-star" size={14} />
                  {rating.toFixed(1)}
                </>
              ) : (
                <span className="owner-store-property-rating--muted">{t("ownerStorePage.noRatingYet")}</span>
              )}
            </span>
            <span className="owner-store-property-price">
              {item.precio_desde != null ? (
                <>
                  <span className="owner-store-property-price-label">{t("price.from")}</span>
                  <strong>{formatMoney(item.precio_desde)}</strong>
                  <span className="owner-store-property-price-unit">{t("price.perNight")}</span>
                </>
              ) : (
                t("price.consult")
              )}
            </span>
          </div>
          <span className="owner-store-property-cta">
            {t("ownerStorePage.viewDetails")}
            <PrimeIcon name="pi-arrow-right" size={14} />
          </span>
        </div>
      </Link>
    </article>
  );
}
