import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

export type SortKey = "match" | "rating" | "new" | "price-asc" | "price-desc";

export type PropertyFilters = {
  types: string[];
  priceMax: number | null;
  services: string[];
};

type Props = {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  filters: PropertyFilters;
  onFiltersChange: (f: PropertyFilters) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
};

const SORT_KEYS: { key: SortKey | "price-toggle"; labelKey: string }[] = [
  { key: "match", labelKey: "ownerStorePage.sortMatch" },
  { key: "rating", labelKey: "ownerStorePage.sortRating" },
  { key: "new", labelKey: "ownerStorePage.sortNew" },
  { key: "price-toggle", labelKey: "ownerStorePage.sortPrice" },
];

export function OwnerStoreFilters({
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  filtersOpen,
  onToggleFilters,
}: Props) {
  const { t } = useLocaleCurrency();

  const toggleType = (type: string) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((x) => x !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types });
  };

  const toggleService = (slug: string) => {
    const services = filters.services.includes(slug)
      ? filters.services.filter((x) => x !== slug)
      : [...filters.services, slug];
    onFiltersChange({ ...filters, services });
  };

  return (
    <div className="owner-store-filters-wrap">
      <div className="owner-store-filters-scroll">
        {SORT_KEYS.map(({ key, labelKey }) => {
          const isPrice = key === "price-toggle";
          const active = isPrice
            ? sort === "price-asc" || sort === "price-desc"
            : sort === key;
          return (
            <button
              key={key}
              type="button"
              className={`owner-store-chip${active ? " is-active" : ""}`}
              onClick={() => {
                if (isPrice) {
                  onSortChange(sort === "price-asc" ? "price-desc" : "price-asc");
                } else {
                  onSortChange(key as SortKey);
                }
              }}
            >
              {t(labelKey)}
              {isPrice && (
                <PrimeIcon
                  name={sort === "price-desc" ? "pi-sort-down" : "pi-sort-up"}
                  size={14}
                />
              )}
              {active && !isPrice && <PrimeIcon name="pi-check" size={14} />}
            </button>
          );
        })}
        <button
          type="button"
          className={`owner-store-chip owner-store-chip--filter${filtersOpen ? " is-active" : ""}`}
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
        >
          <PrimeIcon name="pi-filter" size={14} />
          {t("ownerStorePage.moreFilters")}
        </button>
      </div>

      {filtersOpen && (
        <div className="owner-store-filters-panel">
          <p className="owner-store-filters-panel-label">{t("ownerStorePage.filterType")}</p>
          <div className="owner-store-filters-panel-chips">
            {(["hotel", "hostal", "hospedaje"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`owner-store-chip owner-store-chip--sm${filters.types.includes(type) ? " is-active" : ""}`}
                onClick={() => toggleType(type)}
              >
                {t(`type.${type}`)}
              </button>
            ))}
          </div>
          <p className="owner-store-filters-panel-label">{t("ownerStorePage.filterServices")}</p>
          <div className="owner-store-filters-panel-chips">
            {[
              { slug: "wifi", label: "WiFi" },
              { slug: "estacionamiento", label: t("ownerStorePage.parking") },
            ].map(({ slug, label }) => (
              <button
                key={slug}
                type="button"
                className={`owner-store-chip owner-store-chip--sm${filters.services.includes(slug) ? " is-active" : ""}`}
                onClick={() => toggleService(slug)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="owner-store-filters-price">
            {t("ownerStorePage.filterMaxPrice")}
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={filters.priceMax ?? 500}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceMax: Number(e.target.value) >= 500 ? null : Number(e.target.value),
                })
              }
            />
            <span>{filters.priceMax != null ? `≤ ${filters.priceMax}` : t("ownerStorePage.anyPrice")}</span>
          </label>
        </div>
      )}
    </div>
  );
}
