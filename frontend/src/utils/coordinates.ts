/** Máximo 6 decimales (compatible con DecimalField max_digits=9, decimal_places=6). */
const COORD_DECIMALS = 6;

export function roundCoordinate(value: number | string): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(n * factor) / factor;
}

export function formatCoordinate(value: number | string): string {
  return roundCoordinate(value).toFixed(COORD_DECIMALS);
}
