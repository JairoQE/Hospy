import { useEffect, useMemo, useState } from "react";
import type { AccommodationListItem } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { AccommodationCard } from "../AccommodationCard";
import { SkeletonAccGrid } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";

const TYPE_IDS = ["hotel", "hostal", "hospedaje", "casa_departamento"] as const;

type Props = {
  items: AccommodationListItem[];
  loading: boolean;
  radiusKm: number;
};

export function NearbySection({ items, loading, radiusKm }: Props) {
  const { t, tVars } = useLocaleCurrency();

  const groups = useMemo(
    () =>
      TYPE_IDS.map((id) => ({
        id,
        title: t(`home.typesPlural.${id}`),
        items: items.filter((i) => i.type === id),
        count: items.filter((i) => i.type === id).length,
      })),
    [items, t],
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
          {t("home.nearbyTitle")}
        </h2>
        <EmptyState
          icon="pi-map-marker"
          title={t("home.nearbyEmpty")}
          message={tVars("home.nearbyEmptyMsg", { km: radiusKm })}
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
        {t("home.nearbyTitle")}
      </h2>
      <p className="muted home-block-sub">
        {tVars("home.nearbySub", { km: radiusKm })}
      </p>

      {loading ? (
        <SkeletonAccGrid count={4} />
      ) : (
        <>
          {mobileSelect ? (
            <label className="nearby-tabs-select">
              <span className="sr-only">{t("home.browseByType")}</span>
              <select
                value={activeTab}
                onChange={(e) => selectTab(e.target.value)}
                aria-label={t("home.browseByType")}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.count === 0}>
                    {g.title} ({g.count})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="nearby-tabs" role="tablist" aria-label={t("home.nearbyTitle")}>
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
              <p className="muted nearby-empty">{t("home.nearbyNoCategory")}</p>
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
