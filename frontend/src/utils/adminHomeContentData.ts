import type { BrowseTile } from "../api/types";

export type HomeContentGroup = "tipo" | "region" | "departamento";

export type AdminConfigTab = HomeContentGroup | "diseno";

export type HomeContentStatusFilter = "all" | "active" | "inactive";

export const HOME_CONTENT_GROUPS: { value: HomeContentGroup; label: string }[] = [
  { value: "tipo", label: "Tipos de alojamiento" },
  { value: "region", label: "Regiones naturales" },
  { value: "departamento", label: "Departamentos" },
];

export const ADMIN_CONFIG_TABS: { value: AdminConfigTab; label: string; icon?: string }[] = [
  ...HOME_CONTENT_GROUPS,
  { value: "diseno", label: "Diseño", icon: "pi-palette" },
];

export const FILTER_HINT: Record<HomeContentGroup, string> = {
  tipo: "hotel, hostal, hospedaje, casa_departamento",
  region: "costa, sierra, selva",
  departamento: "Lima, Cusco, Arequipa…",
};

export const GROUP_SECTION_COPY: Record<
  HomeContentGroup,
  { previewTitle: string; previewSubtitle?: string }
> = {
  tipo: { previewTitle: "Busca por tipo de alojamiento" },
  region: {
    previewTitle: "Explora por región natural",
    previewSubtitle: "Costa, Sierra o Selva del Perú",
  },
  departamento: {
    previewTitle: "Explora por departamento",
    previewSubtitle: "Departamentos con alojamientos en Hospy",
  },
};

/** Formatea conteo de clics para la UI admin. */
export function formatClicks(n: number): string {
  return n.toLocaleString("es-PE");
}

export function filterHomeTiles(
  tiles: BrowseTile[],
  opts: { search: string; status: HomeContentStatusFilter },
): BrowseTile[] {
  const needle = opts.search.trim().toLowerCase();
  return tiles
    .filter((t) => {
      if (opts.status === "active") return t.is_active !== false;
      if (opts.status === "inactive") return t.is_active === false;
      return true;
    })
    .filter((t) => {
      if (!needle) return true;
      const hay = [t.title, t.subtitle ?? "", t.filter_value, t.slug].join(" ").toLowerCase();
      return hay.includes(needle);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
}

export function reorderTiles(list: BrowseTile[], fromIndex: number, toIndex: number): BrowseTile[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((t, i) => ({ ...t, order: i + 1 }));
}
