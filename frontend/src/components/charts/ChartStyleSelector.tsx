import { useMemo, useState, type CSSProperties } from "react";
import {
  CHART_STYLE_OPTIONS,
  chartStylesByCategory,
  type ChartStyleId,
} from "./chartStyles";
import { ChartStylePreview } from "./ChartStylePreview";

type Props = {
  value: ChartStyleId;
  onChange: (style: ChartStyleId) => void;
  onHoverPreview?: (style: ChartStyleId | null) => void;
};

export function ChartStyleSelector({ value, onChange, onHoverPreview }: Props) {
  const [hovered, setHovered] = useState<ChartStyleId | null>(null);
  const groups = useMemo(() => chartStylesByCategory(), []);

  const handleHover = (id: ChartStyleId | null) => {
    setHovered(id);
    onHoverPreview?.(id);
  };

  return (
    <div className="admin-chart-style-selector">
      {groups.map((group) => (
        <div key={group.category} className="admin-chart-style-category">
          <h3 className="admin-chart-style-category-title">{group.label}</h3>
          <div className="admin-design-chart-style-grid">
            {group.options.map((option) => {
              const active = value === option.id;
              const previewing = hovered === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    "admin-design-chart-style-card",
                    "admin-chart-style-card--fade",
                    active ? "is-active" : "",
                    previewing ? "is-previewing" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onChange(option.id)}
                  onMouseEnter={() => handleHover(option.id)}
                  onMouseLeave={() => handleHover(null)}
                  onFocus={() => handleHover(option.id)}
                  onBlur={() => handleHover(null)}
                  aria-pressed={active}
                >
                  <div
                    className="admin-design-chart-style-preview"
                    style={
                      {
                        "--preview-a": option.preview[0],
                        "--preview-b": option.preview[1],
                        "--preview-c": option.preview[2],
                      } as CSSProperties
                    }
                  >
                    <ChartStylePreview styleId={option.id} variant="mini" />
                  </div>
                  <span className="admin-design-chart-style-name">{option.name}</span>
                  <span className="admin-design-chart-style-desc">{option.description}</span>
                  <span className="admin-chart-style-when">{option.whenToUse}</span>
                  <span className="admin-chart-style-swatches" aria-hidden>
                    {option.preview.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="admin-chart-style-reset-row">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange("flat_professional")}
        >
          Restablecer a Flat Professional
        </button>
        <span className="muted admin-chart-style-reset-hint">
          {CHART_STYLE_OPTIONS.length} estilos · la vista previa se actualiza al instante
        </span>
      </div>
    </div>
  );
}
