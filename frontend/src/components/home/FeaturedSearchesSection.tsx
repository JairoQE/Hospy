import { useMemo, useState } from "react";

import type { FeaturedSearchItem } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";
import { StarRating } from "../StarRating";
import { HorizontalCarousel } from "../ui/HorizontalCarousel";

type Tab = "cities" | "events" | "places" | "restaurants";

interface Props {
  cities: FeaturedSearchItem[];
  events: FeaturedSearchItem[];
  places: FeaturedSearchItem[];
  restaurants: FeaturedSearchItem[];
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
  const isGeo =
    item.kind === "event" ||
    item.kind === "place" ||
    item.kind === "restaurant";

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
        {item.badge ? (
          <span className="featured-search-card-badge">{item.badge}</span>
        ) : null}
      </div>
      <div className="featured-search-card-body">
        <h3>{item.name}</h3>
        {item.subtitle ? (
          <p className="featured-search-card-sub">{item.subtitle}</p>
        ) : null}
        {rating > 0 ? (
          <div className="featured-search-card-rating">
            <StarRating rating={rating} size="sm" />
          </div>
        ) : (
          <p className="featured-search-card-rating featured-search-card-rating--new">
            {item.capacity_label
              ? item.capacity_label
              : `★ ${t("price.new")}`}
          </p>
        )}
        <p className="featured-search-card-meta">
          <strong>{item.hotels_count.toLocaleString()}</strong>{" "}
          {isGeo
            ? t("home.tileNearbyLocalsSuffix")
            : t("home.tileLocalsSuffix")}
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
  events,
  places,
  restaurants,
  loading = false,
  onSelect,
}: Props) {
  const { t } = useLocaleCurrency();
  const [tab, setTab] = useState<Tab>("cities");

  const hasCities = cities.length > 0;
  const hasEvents = events.length > 0;
  const hasPlaces = places.length > 0;
  const hasRestaurants = restaurants.length > 0;

  const defaultTab = useMemo<Tab>(() => {
    if (hasCities) return "cities";
    if (hasEvents) return "events";
    if (hasPlaces) return "places";
    if (hasRestaurants) return "restaurants";
    return "cities";
  }, [hasCities, hasEvents, hasPlaces, hasRestaurants]);

  const activeTab =
    (tab === "cities" && !hasCities) ||
    (tab === "events" && !hasEvents) ||
    (tab === "places" && !hasPlaces) ||
    (tab === "restaurants" && !hasRestaurants)
      ? defaultTab
      : tab;

  const visibleItems =
    activeTab === "cities"
      ? cities
      : activeTab === "events"
        ? events
        : activeTab === "places"
          ? places
          : restaurants;

  if (!loading && !hasCities && !hasEvents && !hasPlaces && !hasRestaurants) {
    return null;
  }

  return (
    <section
      className="home-block fade-in featured-searches-section"
      id="destacados"
      data-tour="home-featured"
    >
      <h2 className="home-block-title">{t("home.featuredTitle")}</h2>
      <p className="home-block-sub muted">{t("home.featuredLead")}</p>

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
          className={`featured-searches-tab${activeTab === "events" ? " is-active" : ""}`}
          aria-selected={activeTab === "events"}
          disabled={!hasEvents && !loading}
          onClick={() => setTab("events")}
        >
          {t("home.featuredTabEvents")}
        </button>
        <button
          type="button"
          role="tab"
          className={`featured-searches-tab${activeTab === "places" ? " is-active" : ""}`}
          aria-selected={activeTab === "places"}
          disabled={!hasPlaces && !loading}
          onClick={() => setTab("places")}
        >
          {t("home.featuredTabPlaces")}
        </button>
        <button
          type="button"
          role="tab"
          className={`featured-searches-tab${activeTab === "restaurants" ? " is-active" : ""}`}
          aria-selected={activeTab === "restaurants"}
          disabled={!hasRestaurants && !loading}
          onClick={() => setTab("restaurants")}
        >
          {t("home.featuredTabRestaurants")}
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
