import { useEffect, useMemo, useState } from "react";
import type { AccommodationListItem } from "../../api/types";
import { AccommodationCard } from "../AccommodationCard";
import { SkeletonAccGrid } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";

const TYPES = [
  { id: "hotel", title: "Hoteles" },
  { id: "hostal", title: "Hostales" },
  { id: "hospedaje", title: "Hospedajes" },
] as const;

type Props = {
  items: AccommodationListItem[];
  loading: boolean;
  radiusKm: number;
};

export function NearbySection({ items, loading, radiusKm }: Props) {
  const groups = useMemo(
    () =>
      TYPES.map((t) => ({
        ...t,
        items: items.filter((i) => i.type === t.id),
        count: items.filter((i) => i.type === t.id).length,
      })),
    [items],
  );

  const firstWithResults = groups.find((g) => g.count > 0)?.id ?? groups[0].id;
  const [activeTab, setActiveTab] = useState<string>(firstWithResults);
  const [fadeKey, setFadeKey] = useState(0);
  const [mobileSelect, setMobileSelect] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setMobileSelect(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!groups.some((g) => g.id === activeTab && g.count > 0)) {
      setActiveTab(firstWithResults);
    }
  }, [groups, activeTab, firstWithResults]);

  const selectTab = (id: string) => {
    setActiveTab(id);
    setFadeKey((k) => k + 1);
  };

  const active = groups.find((g) => g.id === activeTab) ?? groups[0];

  if (!loading && items.length === 0) {
    return (
      <section className="home-block fade-in section-nearby" aria-labelledby="nearby-title">
        <h2 id="nearby-title" className="home-block-title">
          Cerca de ti
        </h2>
        <EmptyState
          icon="pi-map-marker"
          title="Sin alojamientos cercanos"
          message={`No hay publicaciones en un radio de ${radiusKm} km por ahora.`}
        />
      </section>
    );
  }

  return (
    <section
      className="home-block fade-in section-nearby"
      aria-labelledby="nearby-title"
      aria-live="polite"
    >
      <h2 id="nearby-title" className="home-block-title">
        Cerca de ti
      </h2>
      <p className="muted home-block-sub">Radio de {radiusKm} km desde tu ubicación</p>

      {loading ? (
        <SkeletonAccGrid count={4} />
      ) : (
        <>
          {mobileSelect ? (
            <label className="nearby-tabs-select">
              <span className="sr-only">Tipo de alojamiento</span>
              <select
                value={activeTab}
                onChange={(e) => selectTab(e.target.value)}
                aria-label="Filtrar por tipo de alojamiento"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.count === 0}>
                    {g.title} ({g.count})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="nearby-tabs" role="tablist" aria-label="Tipos de alojamiento cercanos">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  id={`nearby-tab-${g.id}`}
                  aria-selected={activeTab === g.id}
                  aria-controls={`nearby-panel-${g.id}`}
                  className={`nearby-tab${activeTab === g.id ? " is-active" : ""}`}
                  disabled={g.count === 0}
                  onClick={() => selectTab(g.id)}
                >
                  {g.title} <span className="nearby-tab-count">({g.count})</span>
                </button>
              ))}
            </div>
          )}

          <div
            key={fadeKey}
            className="nearby-panel tab-panel-fade"
            role="tabpanel"
            id={`nearby-panel-${active.id}`}
            aria-labelledby={`nearby-tab-${active.id}`}
          >
            {active.count === 0 ? (
              <p className="muted nearby-empty">Sin resultados en esta categoría.</p>
            ) : (
              <div className="acc-grid">
                {active.items.map((item) => (
                  <AccommodationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
