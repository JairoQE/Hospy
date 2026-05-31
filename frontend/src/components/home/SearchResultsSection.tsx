import { useEffect, useMemo, useRef } from "react";
import type { AccommodationListItem } from "../../api/types";
import type { SearchFilters } from "../SearchBar";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { AccommodationCard } from "../AccommodationCard";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonAccGrid } from "../ui/Skeleton";
import type { UbigeoItem } from "./LocationExplorer";
import { cityMatchesDistritoName } from "../../utils/normalizePlaceText";

const EMPTY_DISTRICT_KEY = "__empty__";

function groupItemsByDistrict(
  items: AccommodationListItem[],
  sortLocale: string,
): { key: string; label: string; items: AccommodationListItem[] }[] {
  const map = new Map<string, AccommodationListItem[]>();
  for (const item of items) {
    const raw = (item.city ?? "").trim();
    const key = raw || EMPTY_DISTRICT_KEY;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === EMPTY_DISTRICT_KEY) return 1;
      if (b === EMPTY_DISTRICT_KEY) return -1;
      return a.localeCompare(b, sortLocale, { sensitivity: "base" });
    })
    .map(([key, group]) => ({ key, label: key, items: group }));
}

type UbigeoSection = {
  key: string;
  distritoNombre: string;
  provinciaLine?: string;
  isOtherBucket: boolean;
  items: AccommodationListItem[];
};

function buildUbigeoSections(
  catalog: UbigeoItem[],
  items: AccommodationListItem[],
  otherTitle: string,
): UbigeoSection[] {
  const usedIds = new Set<number>();
  const sections: UbigeoSection[] = catalog.map((d) => {
    const nombre = d.nombre;
    const group: AccommodationListItem[] = [];
    for (const item of items) {
      if (usedIds.has(item.id)) continue;
      if (cityMatchesDistritoName(item.city, nombre)) {
        group.push(item);
        usedIds.add(item.id);
      }
    }
    return {
      key: String(d.id ?? d.codigo ?? nombre),
      distritoNombre: nombre,
      provinciaLine: d.provincia_nombre || undefined,
      isOtherBucket: false,
      items: group,
    };
  });
  const unmatched = items.filter((i) => !usedIds.has(i.id));
  if (unmatched.length) {
    sections.push({
      key: "__other__",
      distritoNombre: otherTitle,
      provinciaLine: undefined,
      isOtherBucket: true,
      items: unmatched,
    });
  }
  return sections;
}

type Props = {
  title: string | null;
  items: AccommodationListItem[];
  loading: boolean;
  error: string;
  filters: SearchFilters | null;
  hasBrowse: boolean;
  /** Búsqueda por departamento, provincia o destino amplio: mostrar bloques por distrito. */
  groupByDistrito?: boolean;
  /** Catálogo UBIGEO: vacío [] = no hay padrón (solo agrupar por resultados); con ítems = listar todos los distritos. */
  districtCatalog?: UbigeoItem[];
  districtCatalogLoading?: boolean;
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
  groupByDistrito = false,
  districtCatalog,
  districtCatalogLoading = false,
  showBackToHome = false,
  onBackToHome,
  onClear,
  onRetry,
}: Props) {
  const { t, language } = useLocaleCurrency();
  const firstCardRef = useRef<HTMLAnchorElement>(null);
  const sortLocale = language === "en" ? "en" : "es-PE";

  const showFullUbigeoList =
    groupByDistrito &&
    !districtCatalogLoading &&
    districtCatalog !== undefined &&
    districtCatalog.length > 0;

  const districtGroups = useMemo(() => {
    if (!groupByDistrito || items.length === 0 || showFullUbigeoList) return null;
    return groupItemsByDistrict(items, sortLocale);
  }, [groupByDistrito, items, sortLocale, showFullUbigeoList]);

  const ubigeoSections = useMemo(() => {
    if (!showFullUbigeoList || !districtCatalog?.length) return null;
    return buildUbigeoSections(districtCatalog, items, t("home.districtOtherResults"));
  }, [showFullUbigeoList, districtCatalog, items, t]);

  const showNoResultsEmpty =
    !loading &&
    !error &&
    items.length === 0 &&
    !ubigeoSections &&
    !(groupByDistrito && districtCatalogLoading);

  useEffect(() => {
    if (!loading && !error && items.length > 0) {
      const timer = window.setTimeout(() => firstCardRef.current?.focus(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, error, items.length]);

  if (!title) return null;

  const firstCardId = (() => {
    if (ubigeoSections) {
      for (const s of ubigeoSections) {
        if (s.items[0]) return s.items[0].id;
      }
    }
    if (districtGroups?.[0]?.items[0]) return districtGroups[0].items[0].id;
    return items[0]?.id;
  })();

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

      {!loading && groupByDistrito && !error && (
        <>
          {(items.length > 0 || ubigeoSections) && (
            <p className="muted home-results-group-hint">{t("home.resultsGroupedByDistrito")}</p>
          )}
          {districtCatalogLoading && !ubigeoSections && (
            <p className="muted home-results-catalog-loading">{t("home.districtCatalogLoading")}</p>
          )}
        </>
      )}

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

      {!loading && !error && showNoResultsEmpty && (
        <EmptyState
          icon="pi-search"
          title={t("home.noResultsTitle")}
          message={t("home.noResultsMsg")}
        />
      )}

      {!loading && !error && items.length > 0 && !groupByDistrito && (
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

      {!loading && !error && ubigeoSections && (
        <div className="home-results-by-district">
          {ubigeoSections.map((section) => (
            <section key={section.key} className="home-results-district-block">
              <h3 className="home-results-district-heading">
                {!section.isOtherBucket && (
                  <span className="home-results-district-kind">{t("home.distritoLabel")}</span>
                )}
                <span className="home-results-district-name">{section.distritoNombre}</span>
              </h3>
              {section.provinciaLine && !section.isOtherBucket && (
                <p className="muted home-results-district-prov">{section.provinciaLine}</p>
              )}
              {section.items.length === 0 ? (
                <p className="muted home-results-district-empty">{t("home.noStaysInDistrict")}</p>
              ) : (
                <div className="acc-grid">
                  {section.items.map((item) => (
                    <AccommodationCard
                      key={item.id}
                      item={item}
                      checkIn={filters?.entrada}
                      checkOut={filters?.salida}
                      cardRef={item.id === firstCardId ? firstCardRef : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {!loading && !error && items.length > 0 && !ubigeoSections && districtGroups && (
        <div className="home-results-by-district">
          {districtGroups.map((group) => {
            const heading =
              group.key === EMPTY_DISTRICT_KEY ? t("home.distritoUnknown") : group.label;
            return (
              <section key={group.key} className="home-results-district-block">
                <h3 className="home-results-district-heading">
                  <span className="home-results-district-kind">{t("home.distritoLabel")}</span>
                  <span className="home-results-district-name">{heading}</span>
                </h3>
                <div className="acc-grid">
                  {group.items.map((item) => (
                    <AccommodationCard
                      key={item.id}
                      item={item}
                      checkIn={filters?.entrada}
                      checkOut={filters?.salida}
                      cardRef={item.id === firstCardId ? firstCardRef : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
