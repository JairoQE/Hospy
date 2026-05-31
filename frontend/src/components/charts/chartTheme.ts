/** Tema visual compartido para gráficos Recharts (dashboards admin y propietario). */

export const CHART_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
] as const;

export const CHART_SERIES = {
  revenue: { stroke: "#10b981", fill: "url(#grad-emerald-area)", bar: "url(#grad-emerald-bar)" },
  bookings: { stroke: "#6366f1", fill: "url(#grad-indigo-area)", bar: "url(#grad-indigo-bar)" },
  occupancy: { stroke: "#3b82f6", fill: "url(#grad-blue-area)", bar: "url(#grad-blue-bar)" },
  confirmed: { stroke: "#10b981", fill: "url(#grad-emerald-bar)", area: "url(#grad-emerald-area)" },
  cancelled: { stroke: "#f43f5e", fill: "url(#grad-rose-bar)", area: "url(#grad-rose-area)" },
  teal: { stroke: "#0d9488", fill: "url(#grad-teal-area)", bar: "url(#grad-teal-bar)" },
} as const;

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: "#64748b",
  fontFamily: "Inter, system-ui, sans-serif",
};

export const CHART_AXIS_PROPS = {
  axisLine: false as const,
  tickLine: false as const,
  tick: CHART_AXIS_TICK,
};

export const CHART_GRID = {
  strokeDasharray: "4 8",
  stroke: "#e8edf4",
  vertical: false,
};

export const CHART_GRID_FULL = {
  ...CHART_GRID,
  vertical: true,
  horizontal: true,
};

export const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 4 };

export const CHART_LEGEND = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: {
    paddingTop: 14,
    fontSize: 12,
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#475569",
  },
};

export const CHART_ACTIVE_DOT = {
  r: 6,
  stroke: "#fff",
  strokeWidth: 2,
};

export function pieCellColor(index: number, fallback?: string): string {
  return fallback ?? CHART_PALETTE[index % CHART_PALETTE.length];
}
