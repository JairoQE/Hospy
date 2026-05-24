import type { Paginated } from "./types";

/** DRF suele devolver { count, results } en lugar de un array directo. */
export function unwrapList<T>(data: T[] | Paginated<T> | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
