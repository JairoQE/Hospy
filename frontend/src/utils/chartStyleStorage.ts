import { normalizeChartStyle, type ChartStyleId } from "@/components/charts/chartStyles";

export const CHART_STYLE_STORAGE_KEY = "hospy-chart-style";

export function persistChartStyle(style: ChartStyleId): void {
  try {
    localStorage.setItem(CHART_STYLE_STORAGE_KEY, style);
  } catch {
    /* quota / private mode */
  }
}

export function readStoredChartStyle(): ChartStyleId | null {
  try {
    const raw = localStorage.getItem(CHART_STYLE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeChartStyle(raw);
  } catch {
    return null;
  }
}

export function subscribeChartStyleStorage(
  onChange: (style: ChartStyleId) => void,
): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key !== CHART_STYLE_STORAGE_KEY || !event.newValue) return;
    onChange(normalizeChartStyle(event.newValue));
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
