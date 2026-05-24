import type { BrowseTile } from "../api/types";

const TYPE_ICONS: Record<string, string> = {
  hotel: "pi-building",
  hostal: "pi-inbox",
  hospedaje: "pi-home",
};

const REGION_ICONS: Record<string, string> = {
  costa: "pi-sun",
  sierra: "pi-chart-line",
  selva: "pi-globe",
};

export function tileIcon(tile: BrowseTile): string {
  if (tile.group === "tipo") {
    const key = tile.filter_value.toLowerCase();
    return TYPE_ICONS[key] ?? "pi-building";
  }
  if (tile.group === "region") {
    const key = tile.filter_value.toLowerCase();
    return REGION_ICONS[key] ?? "pi-map-marker";
  }
  return "pi-map";
}

/** Extrae conteo de alojamientos del subtítulo si viene como número. */
export function tileCountBadge(tile: BrowseTile): string | null {
  if (!tile.subtitle?.trim()) return null;
  const m = tile.subtitle.match(/(\d[\d.,]*)/);
  return m ? m[1] : null;
}
