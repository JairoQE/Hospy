import { useMemo, useState } from "react";

import type { FeaturedSearchItem } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";
import { StarRating } from "../StarRating";
import { HorizontalCarousel } from "../ui/HorizontalCarousel";

type Tab = "cities" | "destinations";

interface Props {
  cities: FeaturedSearchItem[];
  destinations: FeaturedSearchItem[];
  loading?: boolean;
  onSelect: (item: FeaturedSearchItem) => void;
}

function FeaturedSearchCard({
  item,
  onSelect,
  noPhotoLabel,
}: {
  item: FeaturedSearchItem;
  onSelect: (item: FeaturedSearchItem) => void;
  noPhotoLabel: string;
}) {
  const { t } = useLocaleCurrency();
  const imageUrl = resolveMediaUrl(item.image_url);
  const rating = Number(item.rating_avg) || 0;

  return (
    <button
      type="button"
      className="featured-search-card"
      onClick={() => onSelect(item)}
    >
      <div
        className="featured-search-card-image"
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : item.gradient_css
              ? { background: item.gradient_css }
              : undefined
        }
      >
        {!imageUrl && !item.gradient_css && (
          <span className="featured-search-card-placeholder">{noPhotoLabel}</span>
        )}
      </div>
      <div className="featured-search-card-body">
        <h3>{item.name}</h3>
        {rating > 0 ? (
          <div className="featured-search-card-rating">
            <StarRating rating={rating} size="sm" />
          </div>
        ) : (
          <p className="featured-search-card-rating featured-search-card-rating--new">
            ★ {t("price.new")}
          </p>
        )}
        <p className="featured-search-card-meta">
          <strong>{item.hotels_count.toLocaleString()}</strong>{" "}
          {t("home.tileLocalsSuffix")}
        </p>
        {item.price_from != null && (
          <p className="featured-search-card-price">
            <strong>{formatMoney(item.price_from)}</strong> {t("home.priceAvgSuffix")}
          </p>
        )}
      </div>
    </button>
  );
}

function FeaturedSearchSkeleton() {
  return (
    <div className="featured-search-card featured-search-card--skeleton" aria-hidden>
      <div className="featured-search-card-image skeleton" />
      <div className="featured-search-card-body">
        <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        <div className="skeleton skeleton-line" style={{ width: "50%", marginTop: "0.45rem" }} />
        <div className="skeleton skeleton-line" style={{ width: "40%", marginTop: "0.45rem" }} />
      </div>
    </div>
  );
}

export function FeaturedSearchesSection({
  cities,
  destinations,
  loading = false,
  onSelect,
}: Props) {
  const { t } = useLocaleCurrency();
  const [tab, setTab] = useState<Tab>("cities");

  const hasCities = cities.length > 0;
  const hasDestinations = destinations.length > 0;

  const defaultTab = useMemo<Tab>(() => {
    if (hasCities) return "cities";
    if (hasDestinations) return "destinations";
    return "cities";
  }, [hasCities, hasDestinations]);

  const activeTab = tab === "cities" && !hasCities ? defaultTab : tab;
  const visibleItems = activeTab === "cities" ? cities : destinations;

  if (!loading && !hasCities && !hasDestinations) {
    return null;
  }

  return (
    <section className="home-block fade-in featured-searches-section" id="destacados">
      <h2 className="home-block-title">{t("home.featuredTitle")}</h2>

      <div className="featured-searches-tabs" role="tablist" aria-label={t("home.featuredTitle")}>
        <button
          type="button"
          role="tab"
          className={`featured-searches-tab${activeTab === "cities" ? " is-active" : ""}`}
          aria-selected={activeTab === "cities"}
          disabled={!hasCities && !loading}
          onClick={() => setTab("cities")}
        >
          {t("home.featuredTabCities")}
        </button>
        <button
          type="button"
          role="tab"
          className={`featured-searches-tab${activeTab === "destinations" ? " is-active" : ""}`}
          aria-selected={activeTab === "destinations"}
          disabled={!hasDestinations && !loading}
          onClick={() => setTab("destinations")}
        >
          {t("home.featuredTabDestinations")}
        </button>
      </div>

      {loading && visibleItems.length === 0 ? (
        <HorizontalCarousel itemWidth={200} ariaLabel={t("home.featuredTitle")}>
          {Array.from({ length: 5 }, (_, i) => (
            <FeaturedSearchSkeleton key={i} />
          ))}
        </HorizontalCarousel>
      ) : (
        <HorizontalCarousel itemWidth={200} ariaLabel={t("home.featuredTitle")}>
          {visibleItems.map((item) => (
            <FeaturedSearchCard
              key={`${item.kind}-${item.slug}`}
              item={item}
              onSelect={onSelect}
              noPhotoLabel={t("common.noPhoto")}
            />
          ))}
        </HorizontalCarousel>
      )}
    </section>
  );
}
