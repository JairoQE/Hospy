import { useCallback, useMemo, useState } from "react";
import { api } from "../../api/client";
import { recordBrowseTileClick } from "../../api/browseTiles";
import type { BrowseTile } from "../../api/types";
import type { LocationSearchParams } from "../../data/peruLocations";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { BrowseTilesCarousel } from "./BrowseTilesCarousel";
import { Skeleton } from "../ui/Skeleton";

export interface UbigeoItem {
  id: string;
  codigo: string;
  nombre: string;
  departamento_nombre?: string;
  provincia_nombre?: string;
  zona_natural?: "costa" | "sierra" | "selva";
}

interface Props {
  departmentTiles: BrowseTile[];
  departmentsLoading?: boolean;
  onSelect: (params: LocationSearchParams) => void;
}

type Level = "departamento" | "provincia" | "distrito";

const KIND_KEY: Record<Level, string> = {
  departamento: "location.departments",
  provincia: "location.provinces",
  distrito: "location.districts",
};

const ZONA_ORDER = ["costa", "sierra", "selva"] as const;

function groupByZona(items: UbigeoItem[]) {
  const buckets: Record<string, UbigeoItem[]> = {};
  for (const item of items) {
    const z = item.zona_natural || "sierra";
    if (!buckets[z]) buckets[z] = [];
    buckets[z].push(item);
  }
  return ZONA_ORDER.filter((z) => buckets[z]?.length).map((z) => ({
    zona: z,
    items: buckets[z]!,
  }));
}

export function LocationExplorer({
  departmentTiles,
  departmentsLoading = false,
  onSelect,
}: Props) {
  const { t, tVars } = useLocaleCurrency();
  const zonaLabel = (zona: string) => t(`location.${zona}`);
  const kindLabel = (level: Level) => t(KIND_KEY[level]);

  const [depto, setDepto] = useState<UbigeoItem | null>(null);
  const [prov, setProv] = useState<UbigeoItem | null>(null);
  const [items, setItems] = useState<UbigeoItem[]>([]);
  const [level, setLevel] = useState<Level>("departamento");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadProvincias = useCallback(async (departamento: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<UbigeoItem[]>(
        `/ubigeo/provincias/?departamento=${encodeURIComponent(departamento)}`,
        false,
      );
      setItems(Array.isArray(data) ? data : []);
      setLevel("provincia");
    } catch {
      setError(t("location.loadProvError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadDistritos = useCallback(
    async (provincia: string, departamento?: string) => {
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({ provincia });
        if (departamento) q.set("departamento", departamento);
        const data = await api.get<UbigeoItem[]>(`/ubigeo/distritos/?${q}`, false);
        setItems(Array.isArray(data) ? data : []);
        setLevel("distrito");
      } catch {
        setError(t("location.loadDistError"));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const resetToRoot = () => {
    setDepto(null);
    setProv(null);
    setItems([]);
    setLevel("departamento");
    setQuery("");
    setError("");
  };

  const goDepto = () => {
    setProv(null);
    setQuery("");
    if (depto) {
      loadProvincias(depto.nombre);
    } else {
      resetToRoot();
    }
  };

  const onDepartmentTile = (tile: BrowseTile) => {
    void recordBrowseTileClick(tile.id).catch(() => {});
    const item: UbigeoItem = {
      id: tile.slug,
      codigo: tile.filter_value.length <= 2 ? tile.filter_value.padStart(2, "0") : tile.slug,
      nombre: tile.title,
    };
    setDepto(item);
    setProv(null);
    setQuery("");
    loadProvincias(tile.filter_value);
  };

  const pickProvincia = (item: UbigeoItem) => {
    setProv(item);
    setQuery("");
    loadDistritos(item.nombre, depto?.nombre);
  };

  const pickDistrito = (item: UbigeoItem) => {
    onSelect({
      label: `${item.nombre}, ${prov?.nombre ?? ""}, ${depto?.nombre ?? ""}`
        .replace(/, ,/g, ",")
        .replace(/,\s*$/, ""),
      departamento: depto?.nombre,
      provincia: prov?.nombre,
      distrito: item.nombre,
    });
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    if (level !== "provincia") return null;
    return groupByZona(filteredItems).map((g) => ({
      ...g,
      label: zonaLabel(g.zona),
    }));
  }, [filteredItems, level, t]);

  const showZonaGroups = level === "provincia" && grouped && grouped.length > 0;

  const atRoot = !depto;

  return (
    <section className="home-block location-explorer" data-tour="home-locations">
      <h2 className="home-block-title">{t("home.browseByDept")}</h2>
      <p className="muted home-block-sub">{t("home.browseByDeptSub")}</p>

      <nav className="location-breadcrumb" aria-label={t("search.destination")}>
        <button type="button" className="location-crumb" onClick={resetToRoot}>
          {t("common.peru")}
        </button>
        {depto && (
          <span className="location-crumb-wrap">
            <span className="location-crumb-sep">›</span>
            <button type="button" className="location-crumb" onClick={goDepto}>
              {depto.nombre}
            </button>
          </span>
        )}
        {prov && (
          <span className="location-crumb-wrap">
            <span className="location-crumb-sep">›</span>
            <span className="location-crumb location-crumb-current">
              {prov.nombre}
              {prov.zona_natural && (
                <span className={`location-zona-badge location-zona-${prov.zona_natural}`}>
                  {zonaLabel(prov.zona_natural)}
                </span>
              )}
            </span>
          </span>
        )}
      </nav>

      {atRoot ? (
        departmentsLoading ? (
          <div className="location-skeleton-row" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="skeleton-location-tile" />
            ))}
          </div>
        ) : departmentTiles.length > 0 ? (
          <BrowseTilesCarousel
            tiles={departmentTiles}
            onSelect={onDepartmentTile}
            ariaLabel={t("location.deptsAria")}
          />
        ) : (
          <p className="muted">{t("location.noDepts")}</p>
        )
      ) : (
        <>
          <div className="location-explorer-toolbar">
            <p className="location-level-label">
              {kindLabel(level)}
              {items.length > 0 && (
                <span className="location-count"> ({items.length})</span>
              )}
            </p>
            {items.length > 8 && (
              <input
                type="search"
                className="location-search"
                placeholder={tVars("location.searchPlaceholder", {
                  kind: kindLabel(level).toLowerCase(),
                })}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={tVars("location.filterAria", {
                  kind: kindLabel(level).toLowerCase(),
                })}
              />
            )}
          </div>

          {loading && (
            <div className="location-grid location-skeleton-chips" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="skeleton-location-chip" />
              ))}
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}

          {!loading && !error && showZonaGroups && (
            <div className="location-zona-sections">
              {grouped!.map((group) => (
                <section key={group.zona} className="location-zona-section">
                  <h3 className={`location-zona-heading location-zona-${group.zona}`}>
                    {group.label}
                    <span className="location-count"> ({group.items.length})</span>
                  </h3>
                  <div className="location-grid">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="location-chip"
                        onClick={() => pickProvincia(item)}
                      >
                        <span className="location-chip-name">{item.nombre}</span>
                        <span className="location-chip-arrow">›</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {filteredItems.length === 0 && query && (
                <p className="muted location-grid-empty">
                  {tVars("location.noMatch", { query })}
                </p>
              )}
            </div>
          )}

          {!loading && !error && !showZonaGroups && (
            <div className="location-grid location-grid-scroll">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="location-chip"
                  onClick={() =>
                    level === "provincia" ? pickProvincia(item) : pickDistrito(item)
                  }
                >
                  <span className="location-chip-name">{item.nombre}</span>
                  {level === "provincia" && item.zona_natural && (
                    <span className={`location-zona-tag location-zona-${item.zona_natural}`}>
                      {zonaLabel(item.zona_natural)}
                    </span>
                  )}
                  {level === "provincia" && (
                    <span className="location-chip-arrow">›</span>
                  )}
                </button>
              ))}
              {filteredItems.length === 0 && !loading && (
                <p className="muted location-grid-empty">
                  {query ? tVars("location.noMatch", { query }) : t("location.noResults")}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm location-back"
            onClick={() => {
              if (level === "distrito") {
                goDepto();
              } else {
                resetToRoot();
              }
            }}
          >
            <PrimeIcon name="pi-arrow-left" size={14} /> {t("common.back")}
          </button>
        </>
      )}
    </section>
  );
}
