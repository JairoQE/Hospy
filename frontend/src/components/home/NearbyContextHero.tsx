import type { FeaturedSearchItem } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatDate, formatMoney } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";
import { PrimeIcon } from "../PrimeIcon";

const ACTIFY =
  import.meta.env.VITE_ACTIFY_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://actify.qd.je";
const RESTOPOINT =
  import.meta.env.VITE_RESTOPOINT_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://restaurants-seven-tan.vercel.app";
const CONECTA =
  import.meta.env.VITE_CONECTA_TINGO_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://conectatingo.com";

type Props = {
  item: FeaturedSearchItem;
  staysCount?: number | null;
  radiusKm?: number | null;
};

function partnerUrl(item: FeaturedSearchItem): string | null {
  if (item.kind === "event") {
    const id = item.event_id ?? item.search.event_id;
    return id != null ? `${ACTIFY}/events/${id}` : `${ACTIFY}/events`;
  }
  if (item.kind === "restaurant") {
    const slug = (item.slug || "").replace(/^restaurante-/, "");
    const id = item.restaurant_id || item.search.restaurant_id;
    const key = slug && !slug.startsWith("restaurante") ? item.slug : id;
    return key
      ? `${RESTOPOINT}/restaurants/${encodeURIComponent(String(key))}`
      : `${RESTOPOINT}/restaurants`;
  }
  if (item.kind === "place") {
    return `${CONECTA}/lugares`;
  }
  return null;
}

function kindLabel(
  kind: FeaturedSearchItem["kind"],
  t: (key: string) => string,
): string {
  if (kind === "event") return t("home.featuredTabEvents");
  if (kind === "restaurant") return t("home.featuredTabRestaurants");
  if (kind === "place") return t("home.featuredTabPlaces");
  return t("home.featuredTabCities");
}

export function NearbyContextHero({ item, staysCount, radiusKm }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const imageUrl = resolveMediaUrl(item.image_url);
  const lat = item.search.lat;
  const lng = item.search.lng;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;
  const external = partnerUrl(item);
  const provider =
    item.badge ||
    (item.kind === "event"
      ? "Actify"
      : item.kind === "restaurant"
        ? "RestoPoint"
        : item.kind === "place"
          ? "Conecta Tingo"
          : "Hospy");

  return (
    <article className={`nearby-context-hero nearby-context-hero--${item.kind}`}>
      <div
        className="nearby-context-hero-media"
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : item.gradient_css
              ? { backgroundImage: item.gradient_css }
              : undefined
        }
      >
        <div className="nearby-context-hero-media-shade" />
        <div className="nearby-context-hero-media-tags">
          <span className="nearby-context-hero-kind">{kindLabel(item.kind, t)}</span>
          {item.badge ? (
            <span className="nearby-context-hero-badge">{item.badge}</span>
          ) : null}
        </div>
      </div>

      <div className="nearby-context-hero-body">
        <p className="nearby-context-hero-kicker">
          {t("home.nearbyContextKicker")}
        </p>
        <h2 className="nearby-context-hero-title">{item.name}</h2>
        {item.subtitle ? (
          <p className="nearby-context-hero-sub">{item.subtitle}</p>
        ) : null}

        <ul className="nearby-context-hero-facts">
          {item.start_date ? (
            <li>
              <PrimeIcon name="pi-calendar" size={15} />
              <span>{formatDate(item.start_date)}</span>
            </li>
          ) : null}
          {item.capacity_label ? (
            <li>
              <PrimeIcon name="pi-users" size={15} />
              <span>{item.capacity_label}</span>
            </li>
          ) : null}
          {lat != null && lng != null ? (
            <li>
              <PrimeIcon name="pi-map-marker" size={15} />
              <span>
                {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                {radiusKm ? ` · ${tVars("home.nearbyContextRadius", { km: radiusKm })}` : ""}
              </span>
            </li>
          ) : null}
          {staysCount != null && staysCount >= 0 ? (
            <li>
              <PrimeIcon name="pi-home" size={15} />
              <span>
                {tVars("home.nearbyContextStays", { n: staysCount })}
              </span>
            </li>
          ) : null}
          {item.price_from != null ? (
            <li>
              <PrimeIcon name="pi-tag" size={15} />
              <span>
                {t("detail.fromPrice")} {formatMoney(item.price_from)}
              </span>
            </li>
          ) : null}
        </ul>

        <p className="nearby-context-hero-lead muted">
          {item.kind === "event"
            ? t("home.nearbyContextLeadEvent")
            : item.kind === "restaurant"
              ? t("home.nearbyContextLeadRestaurant")
              : t("home.nearbyContextLeadPlace")}
        </p>

        <div className="nearby-context-hero-actions">
          {mapsUrl ? (
            <a
              className="btn btn-outline"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <PrimeIcon name="pi-map" size={14} />
              {t("home.nearbyContextMaps")}
            </a>
          ) : null}
          {external ? (
            <a
              className="btn btn-primary"
              href={external}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tVars("detail.nearbyViewOn", { provider })}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
