import { useEffect, useRef } from "react";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

export type DistrictChip = {
  key: string;
  label: string;
  count: number;
};

export function districtSectionDomId(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `distrito-${safe || "otros"}`;
}

type Props = {
  districts: DistrictChip[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

export function DistrictJumpChips({ districts, activeKey, onSelect }: Props) {
  const { t } = useLocaleCurrency();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeKey || !trackRef.current) return;
    const chip = trackRef.current.querySelector<HTMLButtonElement>(
      `[data-district-key="${CSS.escape(activeKey)}"]`,
    );
    chip?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeKey]);

  if (districts.length < 2) return null;

  return (
    <nav className="home-district-chips" aria-label={t("home.jumpDistrictsLabel")}>
      <div ref={trackRef} className="home-district-chips-track">
        {districts.map((district) => {
          const isActive = district.key === activeKey;
          return (
            <button
              key={district.key}
              type="button"
              data-district-key={district.key}
              className={`home-district-chip${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(district.key)}
            >
              <span className="home-district-chip-label">{district.label}</span>
              <span className="home-district-chip-count" aria-hidden="true">
                {district.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
