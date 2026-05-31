import "../../styles/charts.css";

type PayloadItem = {
  name?: string;
  value?: number;
  color?: string;
};

type Props = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
  formatValue?: (value: number, name?: string) => string;
};

export function ChartTooltip({ active, payload, label, formatValue }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip" role="tooltip">
      {label && <p className="chart-tooltip-label">{label}</p>}
      <ul className="chart-tooltip-list">
        {payload.map((p) => {
          const raw = typeof p.value === "number" ? p.value : Number(p.value);
          const display =
            formatValue && Number.isFinite(raw)
              ? formatValue(raw, p.name)
              : String(p.value ?? "—");
          return (
            <li key={p.name ?? display}>
              <span className="chart-tooltip-dot" style={{ background: p.color ?? "#6366f1" }} />
              <span className="chart-tooltip-name">{p.name}</span>
              <strong className="chart-tooltip-value">{display}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
