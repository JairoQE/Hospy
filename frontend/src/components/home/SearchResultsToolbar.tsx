import { useEffect, useState } from "react";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import {
  DEFAULT_RESULTS_PAGE_SIZE,
  RESULTS_PAGE_SIZE_OPTIONS,
  buildPageNumbers,
  resultRangeLabel,
  totalResultPages,
} from "../../utils/resultsPagination";
import { PrimeIcon } from "../PrimeIcon";

export type ResultsToolbarValues = {
  search: string;
  ordenar: string;
  tipo: string;
  precio_min: string;
  precio_max: string;
  page_size: number;
};

type ListMeta = {
  count: number;
  page: number;
  pageSize: number;
};

type Props = {
  values: ResultsToolbarValues;
  listMeta: ListMeta | null;
  lockedTipo?: string;
  loading?: boolean;
  onApply: (patch: Partial<ResultsToolbarValues>, resetPage?: boolean) => void;
  onPageChange: (page: number) => void;
};

const SORT_OPTIONS = [
  { value: "-rating", key: "home.sortRatingHigh" },
  { value: "rating", key: "home.sortRatingLow" },
  { value: "-fecha", key: "home.sortNewest" },
  { value: "fecha", key: "home.sortOldest" },
  { value: "precio", key: "home.sortPriceAsc" },
  { value: "-precio", key: "home.sortPriceDesc" },
  { value: "nombre", key: "home.sortNameAsc" },
  { value: "-nombre", key: "home.sortNameDesc" },
] as const;

const TYPE_OPTIONS = [
  { value: "", key: "home.filterTypeAll" },
  { value: "hotel", key: "type.hotel" },
  { value: "hostal", key: "type.hostal" },
  { value: "hospedaje", key: "type.hospedaje" },
  { value: "casa_departamento", key: "type.casa_departamento" },
] as const;

export function SearchResultsPagination({
  listMeta,
  loading = false,
  onPageChange,
}: {
  listMeta: ListMeta;
  loading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLocaleCurrency();
  const totalPages = totalResultPages(listMeta.count, listMeta.pageSize);
  const pageNumbers = buildPageNumbers(listMeta.page, totalPages);
  if (totalPages <= 1) return null;

  return (
    <nav
      className="home-results-pagination-nav home-results-pagination-nav--bottom"
      aria-label={t("home.paginationLabel")}
    >
      <button
        type="button"
        className="home-results-page-btn"
        disabled={loading || listMeta.page <= 1}
        aria-label={t("home.paginationPrev")}
        onClick={() => onPageChange(listMeta.page - 1)}
      >
        <PrimeIcon name="pi-chevron-left" size={14} />
      </button>
      {pageNumbers.map((n, idx) =>
        n === "ellipsis" ? (
          <span key={`e-${idx}`} className="home-results-page-ellipsis" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={`home-results-page-btn${n === listMeta.page ? " is-active" : ""}`}
            disabled={loading || n === listMeta.page}
            aria-current={n === listMeta.page ? "page" : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        className="home-results-page-btn"
        disabled={loading || listMeta.page >= totalPages}
        aria-label={t("home.paginationNext")}
        onClick={() => onPageChange(listMeta.page + 1)}
      >
        <PrimeIcon name="pi-chevron-right" size={14} />
      </button>
    </nav>
  );
}

export function SearchResultsToolbar({
  values,
  listMeta,
  lockedTipo,
  loading = false,
  onApply,
  onPageChange,
}: Props) {
  const { t, tVars } = useLocaleCurrency();
  const [searchDraft, setSearchDraft] = useState(values.search);

  useEffect(() => {
    setSearchDraft(values.search);
  }, [values.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft.trim() !== values.search.trim()) {
        onApply({ search: searchDraft.trim() }, true);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps -- debounce intencional

  const totalPages = listMeta
    ? totalResultPages(listMeta.count, listMeta.pageSize)
    : 1;
  const range = listMeta
    ? resultRangeLabel(listMeta.page, listMeta.pageSize, listMeta.count)
    : { from: 0, to: 0 };
  const pageNumbers = listMeta ? buildPageNumbers(listMeta.page, totalPages) : [];

  return (
    <div className="home-results-toolbar">
      <div className="home-results-toolbar-filters">
        <label className="home-results-filter home-results-filter--search">
          <span className="home-results-filter-label">{t("home.filterSearch")}</span>
          <span className="home-results-search-wrap">
            <PrimeIcon name="pi-search" size={16} className="home-results-search-icon" />
            <input
              type="search"
              value={searchDraft}
              placeholder={t("home.filterSearchPlaceholder")}
              disabled={loading}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </span>
        </label>

        <label className="home-results-filter">
          <span className="home-results-filter-label">{t("home.filterSort")}</span>
          <select
            value={values.ordenar}
            disabled={loading}
            onChange={(e) => onApply({ ordenar: e.target.value }, true)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </label>

        {!lockedTipo && (
          <label className="home-results-filter">
            <span className="home-results-filter-label">{t("home.filterType")}</span>
            <select
              value={values.tipo}
              disabled={loading}
              onChange={(e) => onApply({ tipo: e.target.value }, true)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {t(opt.key)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="home-results-filter home-results-filter--price">
          <span className="home-results-filter-label">{t("home.filterPriceMax")}</span>
          <input
            type="number"
            min={0}
            placeholder="S/"
            defaultValue={values.precio_max}
            key={`price-max-${values.precio_max}`}
            disabled={loading}
            onBlur={(e) => {
              if (e.target.value !== values.precio_max) {
                onApply({ precio_max: e.target.value }, true);
              }
            }}
          />
        </label>

        <label className="home-results-filter">
          <span className="home-results-filter-label">{t("home.filterPerPage")}</span>
          <select
            value={String(values.page_size)}
            disabled={loading}
            onChange={(e) =>
              onApply({ page_size: Number(e.target.value) || DEFAULT_RESULTS_PAGE_SIZE }, true)
            }
          >
            {RESULTS_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {tVars("home.filterPerPageOption", { n })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listMeta && listMeta.count > 0 && (
        <div className="home-results-pagination">
          <p className="home-results-pagination-summary">
            {tVars("home.resultsPaginationSummary", {
              from: range.from,
              to: range.to,
              total: listMeta.count,
            })}
          </p>

          {totalPages > 1 && (
            <nav className="home-results-pagination-nav" aria-label={t("home.paginationLabel")}>
              <button
                type="button"
                className="home-results-page-btn"
                disabled={loading || listMeta.page <= 1}
                aria-label={t("home.paginationPrev")}
                onClick={() => onPageChange(listMeta.page - 1)}
              >
                <PrimeIcon name="pi-chevron-left" size={14} />
              </button>

              {pageNumbers.map((n, idx) =>
                n === "ellipsis" ? (
                  <span key={`e-${idx}`} className="home-results-page-ellipsis" aria-hidden>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`home-results-page-btn${n === listMeta.page ? " is-active" : ""}`}
                    disabled={loading || n === listMeta.page}
                    aria-current={n === listMeta.page ? "page" : undefined}
                    onClick={() => onPageChange(n)}
                  >
                    {n}
                  </button>
                ),
              )}

              <button
                type="button"
                className="home-results-page-btn"
                disabled={loading || listMeta.page >= totalPages}
                aria-label={t("home.paginationNext")}
                onClick={() => onPageChange(listMeta.page + 1)}
              >
                <PrimeIcon name="pi-chevron-right" size={14} />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
