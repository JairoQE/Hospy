import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchNearbyExplore,
  type NearbyExploreItem,
  type NearbyExploreResponse,
} from "../../api/nearby";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { resolveMediaUrl } from "../../utils/media";
import { formatDate } from "../../utils/format";
import { NearbyItemPreviewModal } from "./NearbyItemPreviewModal";
import "./NearbyExploreSection.css";

type Props = {
  lat: number;
  lng: number;
  city?: string;
  radioKm?: number;
};

function NearbyCard({
  item,
  onOpen,
}: {
  item: NearbyExploreItem;
  onOpen: (item: NearbyExploreItem) => void;
}) {
  const imageUrl = resolveMediaUrl(item.image_url);
  return (
    <button
      type="button"
      className="nearby-explore-card"
      onClick={() => onOpen(item)}
    >
      <div
        className="nearby-explore-card-media"
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : undefined
        }
      />
      <div className="nearby-explore-card-body">
        <h4>{item.name}</h4>
        {item.subtitle ? <p className="muted">{item.subtitle}</p> : null}
        <p className="nearby-explore-card-meta">
          {item.distance_km != null ? `${item.distance_km} km` : null}
          {item.distance_km != null && item.rating != null ? " · " : null}
          {item.rating != null ? `★ ${item.rating}` : null}
          {item.entry_price ? ` · ${item.entry_price}` : null}
          {item.start_date ? ` · ${formatDate(item.start_date)}` : null}
        </p>
      </div>
    </button>
  );
}

function NearbyGroup({
  title,
  items,
  empty,
  seeAllHref,
  seeAllLabel,
  onOpen,
}: {
  title: string;
  items: NearbyExploreItem[];
  empty: string;
  seeAllHref: string;
  seeAllLabel: string;
  onOpen: (item: NearbyExploreItem) => void;
}) {
  return (
    <div className="nearby-explore-group">
      <div className="nearby-explore-group-head">
        <h3>{title}</h3>
        <Link to={seeAllHref} className="nearby-explore-see-all">
          {seeAllLabel}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="muted nearby-explore-empty">{empty}</p>
      ) : (
        <div className="nearby-explore-grid">
          {items.map((item) => (
            <NearbyCard
              key={`${item.source}-${item.id}-${item.name}`}
              item={item}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NearbyExploreSection({
  lat,
  lng,
  city = "",
  radioKm = 25,
}: Props) {
  const { t } = useLocaleCurrency();
  const [data, setData] = useState<NearbyExploreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<NearbyExploreItem | null>(null);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchNearbyExplore({ lat, lng, radio_km: radioKm, ciudad: city })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(t("detail.nearbyError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, city, radioKm, t]);

  const hasAny =
    (data?.restaurantes.length || 0) +
      (data?.lugares.length || 0) +
      (data?.eventos.length || 0) >
    0;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!loading && !error && !hasAny) return null;

  return (
    <section
      className="property-section nearby-explore-section"
      id="alrededores"
      data-tour="property-nearby"
    >
      <h2>{t("detail.nearbyTitle")}</h2>
      <p className="muted nearby-explore-lead">
        {t("detail.nearbyLead")}
      </p>

      {loading ? <p className="muted">{t("detail.nearbyLoading")}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!loading && data ? (
        <>
          <NearbyGroup
            title={t("detail.nearbyRestaurants")}
            items={data.restaurantes}
            empty={t("detail.nearbyRestaurantsEmpty")}
            seeAllHref="/restaurantes"
            seeAllLabel={t("detail.nearbySeeAll")}
            onOpen={setSelected}
          />
          <NearbyGroup
            title={t("detail.nearbyPlaces")}
            items={data.lugares}
            empty={t("detail.nearbyPlacesEmpty")}
            seeAllHref="/#destacados"
            seeAllLabel={t("detail.nearbySeeAll")}
            onOpen={setSelected}
          />
          <NearbyGroup
            title={t("detail.nearbyEvents")}
            items={data.eventos}
            empty={t("detail.nearbyEventsEmpty")}
            seeAllHref="/eventos"
            seeAllLabel={t("detail.nearbySeeAll")}
            onOpen={setSelected}
          />
        </>
      ) : null}

      <NearbyItemPreviewModal
        item={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
