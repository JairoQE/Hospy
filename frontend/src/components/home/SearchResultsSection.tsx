import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccommodationListItem } from "../../api/types";
import type { SearchFilters } from "../SearchBar";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { AccommodationCard } from "../AccommodationCard";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonAccGrid } from "../ui/Skeleton";
import type { UbigeoItem } from "./LocationExplorer";
import { cityMatchesDistritoName } from "../../utils/normalizePlaceText";
import {
  DistrictJumpChips,
  districtSectionDomId,
  type DistrictChip,
} from "./DistrictJumpChips";

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

type DisplaySection = {
  key: string;
  label: string;
  provinciaLine?: string;
  isOtherBucket: boolean;
  items: AccommodationListItem[];
};

function buildUbigeoSections(
  catalog: UbigeoItem[],
  items: AccommodationListItem[],
  otherTitle: string,
): DisplaySection[] {
  const usedIds = new Set<number>();
  const sections: DisplaySection[] = catalog.map((d) => {
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
      label: nombre,
      provinciaLine: d.provincia_nombre || undefined,
      isOtherBucket: false,
      items: group,
    };
  });
  const unmatched = items.filter((i) => !usedIds.has(i.id));
  if (unmatched.length) {
    sections.push({
      key: "__other__",
      label: otherTitle,
      provinciaLine: undefined,
      isOtherBucket: true,
      items: unmatched,
    });
  }
  return sections.filter((section) => section.items.length > 0);
}

type Props = {
  title: string | null;
  items: AccommodationListItem[];
  loading: boolean;
  error: string;
  filters: SearchFilters | null;
  hasBrowse: boolean;
  groupByDistrito?: boolean;
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
  const { t, tVars, language } = useLocaleCurrency();
  const firstCardRef = useRef<HTMLAnchorElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [activeDistrictKey, setActiveDistrictKey] = useState<string | null>(null);
  const sortLocale = language === "en" ? "en" : "es-PE";

  const showFullUbigeoList =
    groupByDistrito &&
    !districtCatalogLoading &&
    Boolean(filters?.provincia?.trim()) &&
    districtCatalog !== undefined &&
    districtCatalog.length > 0;

  const displaySections = useMemo((): DisplaySection[] | null => {
    if (!groupByDistrito || items.length === 0) return null;

    if (showFullUbigeoList && districtCatalog?.length) {
      return buildUbigeoSections(districtCatalog, items, t("home.districtOtherResults"));
    }

    return groupItemsByDistrict(items, sortLocale).map((group) => ({
      key: group.key,
      label: group.key === EMPTY_DISTRICT_KEY ? t("home.distritoUnknown") : group.label,
      provinciaLine: undefined,
      isOtherBucket: group.key === EMPTY_DISTRICT_KEY,
      items: group.items,
    }));
  }, [
    groupByDistrito,
    items,
    showFullUbigeoList,
    districtCatalog,
    sortLocale,
    t,
  ]);

  const districtChips = useMemo((): DistrictChip[] => {
    if (!displaySections) return [];
    return displaySections.map((section) => ({
      key: section.key,
      label: section.label,
      count: section.items.length,
    }));
  }, [displaySections]);

  const showNoResultsEmpty =
    !loading &&
    !error &&
    items.length === 0 &&
    !(groupByDistrito && districtCatalogLoading);

  const districtSummary = useMemo(() => {
    if (!displaySections?.length || items.length === 0) return null;
    return tVars("home.resultsDistrictSummary", {
      count: String(items.length),
      districts: String(displaySections.length),
    });
  }, [displaySections, items.length, tVars]);

  useEffect(() => {
    if (displaySections?.length) {
      setActiveDistrictKey(displaySections[0].key);
    } else {
      setActiveDistrictKey(null);
    }
  }, [displaySections]);

  useEffect(() => {
    if (!displaySections || displaySections.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target as HTMLElement | undefined;
        const key = top?.dataset.districtKey;
        if (key) setActiveDistrictKey(key);
      },
      { rootMargin: "-12% 0px -58% 0px", threshold: [0.12, 0.35, 0.6] },
    );

    for (const section of displaySections) {
      const node = sectionRefs.current.get(section.key);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [displaySections]);

  const scrollToDistrict = useCallback((key: string) => {
    setActiveDistrictKey(key);
    const node =
      sectionRefs.current.get(key) ?? document.getElementById(districtSectionDomId(key));
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!loading && !error && items.length > 0) {
      const timer = window.setTimeout(() => firstCardRef.current?.focus(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, error, items.length]);

  if (!title) return null;

  const firstCardId = displaySections?.[0]?.items[0]?.id ?? items[0]?.id;

  const setSectionRef = (key: string) => (node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(key, node);
    else sectionRefs.current.delete(key);
  };

  return (
    <section
      className="home-block home-results fade-in"
      id="resultados"
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="home-results-head">
        <div className="home-results-head-main">
          <h2 className="home-block-title">{title}</h2>
          {districtSummary && !loading && !error && (
            <p className="home-results-summary">{districtSummary}</p>
          )}
        </div>
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

      {!loading && groupByDistrito && !error && displaySections && items.length > 0 && (
        <p className="muted home-results-group-hint">{t("home.resultsGroupedByDistrito")}</p>
      )}

      {!loading && !error && displaySections && items.length > 0 && (
        <DistrictJumpChips
          districts={districtChips}
          activeKey={activeDistrictKey}
          onSelect={scrollToDistrict}
        />
      )}

      {districtCatalogLoading && (
        <p className="muted home-results-catalog-loading">{t("home.districtCatalogLoading")}</p>
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

      {!loading && !error && displaySections && (
        <div className="home-results-by-district">
          {displaySections.map((section) => (
            <section
              key={section.key}
              id={districtSectionDomId(section.key)}
              ref={setSectionRef(section.key)}
              data-district-key={section.key}
              className="home-results-district-card"
            >
              <header className="home-results-district-card-head">
                <div className="home-results-district-card-titles">
                  {!section.isOtherBucket && (
                    <span className="home-results-district-kind">{t("home.distritoLabel")}</span>
                  )}
                  <h3 className="home-results-district-name">{section.label}</h3>
                  {section.provinciaLine && !section.isOtherBucket && (
                    <span className="home-results-district-prov">{section.provinciaLine}</span>
                  )}
                </div>
                <span className="home-results-district-count">
                  {section.items.length}{" "}
                  {section.items.length === 1 ? t("home.staySingular") : t("home.staysAbbr")}
                </span>
              </header>
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
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
