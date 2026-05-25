import type { BrowseTile } from "../api/types";
import type { Language } from "../i18n/translations";
import { translate } from "../i18n/translations";

/** Traduce títulos de bloques del inicio (vienen en español desde la API). */
export function translateBrowseTile(tile: BrowseTile, language: Language): BrowseTile {
  if (language === "es-PE") return tile;

  const fv = (tile.filter_value || tile.slug || "").toLowerCase();

  if (tile.group === "tipo") {
    const titleKey = `home.typesPlural.${fv}`;
    const title = translate(titleKey, language);
    return {
      ...tile,
      title: title !== titleKey ? title : tile.title,
      subtitle: tile.subtitle ? translate(`home.typeSub.${fv}`, language) : tile.subtitle,
    };
  }

  if (tile.group === "region") {
    const titleKey = `home.region.${fv}`;
    const subKey = `home.regionSub.${fv}`;
    return {
      ...tile,
      title: translate(titleKey, language) !== titleKey ? translate(titleKey, language) : tile.title,
      subtitle:
        translate(subKey, language) !== subKey ? translate(subKey, language) : tile.subtitle,
    };
  }

  return tile;
}

export function translateBrowseTiles(tiles: BrowseTile[], language: Language): BrowseTile[] {
  return tiles.map((t) => translateBrowseTile(t, language));
}
