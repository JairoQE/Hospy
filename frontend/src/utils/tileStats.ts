import type { BrowseTile } from "../api/types";

export type TileStats = {
  hotels_count: number;
  price_avg: number | null;
};

export type TileStatsMap = Record<string, TileStats>;

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function tileStatsKey(
  tile: Pick<BrowseTile, "group" | "filter_value">,
): string {
  return `${tile.group}|${norm(tile.filter_value)}`;
}

export function applyTileStats(tile: BrowseTile, map: TileStatsMap): BrowseTile {
  const stats = map[tileStatsKey(tile)];
  if (!stats) return tile;
  return {
    ...tile,
    hotels_count: stats.hotels_count,
    price_avg: stats.price_avg,
  };
}

export function applyTileStatsList(
  tiles: BrowseTile[],
  map: TileStatsMap,
): BrowseTile[] {
  return tiles.map((tile) => applyTileStats(tile, map));
}
