import { useEffect, useId, useRef, useState } from "react";
import type { SortKey } from "../../utils/ownerPropertyStats";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  count: number;
  searchQuery: string;
  sortBy: SortKey;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
  onStatusFilterChange: (value: string) => void;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recientes", label: "Recientes" },
  { value: "nombre", label: "Nombre" },
  { value: "estado", label: "Estado" },
];

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "aprobado", label: "Aprobado" },
  { value: "pendiente", label: "Pendiente" },
  { value: "rechazado", label: "Rechazado" },
];

export function OwnerPropertiesToolbar({
  count,
  searchQuery,
  sortBy,
  statusFilter,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
}: Props) {
  const filterId = useId();
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  const countLabel = count === 1 ? "1 hospedaje" : `${count} hospedajes`;

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Filtrar";

  return (
    <div className="owner-properties-toolbar">
      <div className="owner-properties-search" role="search">
        <PrimeIcon name="pi-search" size={18} className="owner-properties-search-icon" />
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar hospedaje por nombre"
        />
      </div>

      <div className="owner-properties-toolbar-controls">
        <div className="owner-properties-filter-wrap" ref={filterRef}>
          <button
            type="button"
            className={`owner-properties-tool-btn${statusFilter !== "all" ? " is-active" : ""}`}
            aria-expanded={filterOpen}
            aria-controls={filterId}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <PrimeIcon name="pi-filter" size={18} />
            <span>{statusFilter === "all" ? "Filtrar" : activeFilterLabel}</span>
          </button>
          {filterOpen && (
            <div id={filterId} className="owner-properties-filter-menu" role="menu">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={statusFilter === opt.value}
                  className={statusFilter === opt.value ? "is-selected" : ""}
                  onClick={() => {
                    onStatusFilterChange(opt.value);
                    setFilterOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="owner-properties-sort-field">
          <label htmlFor="owner-sort-select" className="owner-properties-sort-label">
            Ordenar por
          </label>
          <div className="owner-properties-sort-control">
            <select
              id="owner-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="owner-properties-sort-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <PrimeIcon name="pi-chevron-down" size={14} className="owner-properties-sort-icon" />
          </div>
        </div>

        <p className="owner-properties-count">{countLabel}</p>
      </div>
    </div>
  );
}
