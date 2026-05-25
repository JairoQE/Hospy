import { useEffect, useRef } from "react";
import type { AccommodationListItem } from "../../api/types";
import type { SearchFilters } from "../SearchBar";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { AccommodationCard } from "../AccommodationCard";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonAccGrid } from "../ui/Skeleton";

type Props = {
  title: string | null;
  items: AccommodationListItem[];
  loading: boolean;
  error: string;
  filters: SearchFilters | null;
  hasBrowse: boolean;
  showBackToHome?: boolean;
  onBackToHome?: () => void;
  onClear: () => void;
  onRetry: () => void;
};

export function SearchResultsSection({
  title,
  items,
  loading,
  error,
  filters,
  hasBrowse,
  showBackToHome = false,
  onBackToHome,
  onClear,
  onRetry,
}: Props) {
  const { t } = useLocaleCurrency();
  const firstCardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!loading && !error && items.length > 0) {
      const timer = window.setTimeout(() => firstCardRef.current?.focus(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, error, items.length]);

  if (!title) return null;

  return (
    <section
      className="home-block home-results fade-in"
      id="resultados"
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="home-results-head">
        <h2 className="home-block-title">{title}</h2>
        <div className="home-results-actions">
          {showBackToHome && onBackToHome && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onBackToHome}>
              <PrimeIcon name="pi-arrow-left" size={14} />
              {t("home.backHome")}
            </button>
          )}
          {(filters || hasBrowse) && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onClear}>
              {t("common.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {loading && <SkeletonAccGrid count={6} />}

      {!loading && error && (
        <EmptyState
          icon="pi-exclamation-triangle"
          title={t("home.loadErrorTitle")}
          message={error}
          actionLabel={t("common.retry")}
          onAction={onRetry}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="pi-search"
          title={t("home.noResultsTitle")}
          message={t("home.noResultsMsg")}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="acc-grid">
          {items.map((item, index) => (
            <AccommodationCard
              key={item.id}
              item={item}
              checkIn={filters?.entrada}
              checkOut={filters?.salida}
              cardRef={index === 0 ? firstCardRef : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
