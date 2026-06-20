export const DEFAULT_RESULTS_PAGE_SIZE = 24;
export const RESULTS_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

export type ResultsListQuery = Record<string, string | number | undefined | null>;

export function totalResultPages(count: number, pageSize: number): number {
  if (count <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

export function resultRangeLabel(page: number, pageSize: number, count: number): {
  from: number;
  to: number;
} {
  if (count <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return { from, to };
}

/** Índices de página visibles (1-based), con elipsis cuando hay muchas páginas. */
export function buildPageNumbers(
  current: number,
  total: number,
  maxVisible = 7,
): (number | "ellipsis")[] {
  if (total <= 1) return total === 1 ? [1] : [];
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  for (let delta = 1; delta <= 2; delta += 1) {
    if (current - delta > 1) pages.add(current - delta);
    if (current + delta < total) pages.add(current + delta);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}
