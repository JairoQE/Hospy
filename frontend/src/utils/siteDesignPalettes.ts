import type { SiteDesignSettings } from "../api/siteDesign";

export type DesignPalette = {
  id: string;
  name: string;
  description: string;
  colors: Pick<
    SiteDesignSettings,
    | "primary_color"
    | "accent_color"
    | "hero_color_deep"
    | "hero_color_mid"
    | "hero_color_green"
    | "sidebar_color_deep"
    | "sidebar_color_mid"
    | "sidebar_color_green"
    | "sidebar_menu_accent"
  >;
};

export const DESIGN_PALETTES: DesignPalette[] = [
  {
    id: "hospy",
    name: "Hospy clásico",
    description: "Turquesa peruano con acento cálido",
    colors: {
      primary_color: "#0d6e6e",
      accent_color: "#f4a261",
      hero_color_deep: "#1e3a5f",
      hero_color_mid: "#2c7da0",
      hero_color_green: "#1d6b5c",
      sidebar_color_deep: "#0f2744",
      sidebar_color_mid: "#1a5f7a",
      sidebar_color_green: "#0d4d4a",
      sidebar_menu_accent: "#f4a261",
    },
  },
  {
    id: "ocean",
    name: "Océano nocturno",
    description: "Azules profundos con brillo cyan",
    colors: {
      primary_color: "#2563eb",
      accent_color: "#38bdf8",
      hero_color_deep: "#0c1929",
      hero_color_mid: "#1e4d7b",
      hero_color_green: "#0e7490",
      sidebar_color_deep: "#0a1628",
      sidebar_color_mid: "#1e3a5f",
      sidebar_color_green: "#155e75",
      sidebar_menu_accent: "#38bdf8",
    },
  },
  {
    id: "forest",
    name: "Selva amazónica",
    description: "Verdes profundos y esmeralda",
    colors: {
      primary_color: "#059669",
      accent_color: "#a3e635",
      hero_color_deep: "#14532d",
      hero_color_mid: "#166534",
      hero_color_green: "#047857",
      sidebar_color_deep: "#052e16",
      sidebar_color_mid: "#14532d",
      sidebar_color_green: "#065f46",
      sidebar_menu_accent: "#a3e635",
    },
  },
  {
    id: "sunset",
    name: "Atardecer andino",
    description: "Índigo, coral y púrpura suave",
    colors: {
      primary_color: "#7c3aed",
      accent_color: "#fb923c",
      hero_color_deep: "#312e81",
      hero_color_mid: "#6d28d9",
      hero_color_green: "#9a3412",
      sidebar_color_deep: "#1e1b4b",
      sidebar_color_mid: "#5b21b6",
      sidebar_color_green: "#7c2d12",
      sidebar_menu_accent: "#fb923c",
    },
  },
  {
    id: "midnight",
    name: "Medianoche",
    description: "Gris azulado elegante con menta",
    colors: {
      primary_color: "#334155",
      accent_color: "#2dd4bf",
      hero_color_deep: "#0f172a",
      hero_color_mid: "#334155",
      hero_color_green: "#115e59",
      sidebar_color_deep: "#020617",
      sidebar_color_mid: "#1e293b",
      sidebar_color_green: "#134e4a",
      sidebar_menu_accent: "#2dd4bf",
    },
  },
  {
    id: "coral",
    name: "Costa peruana",
    description: "Teal cálido con coral vibrante",
    colors: {
      primary_color: "#0f766e",
      accent_color: "#f97316",
      hero_color_deep: "#134e4a",
      hero_color_mid: "#0d9488",
      hero_color_green: "#ea580c",
      sidebar_color_deep: "#042f2e",
      sidebar_color_mid: "#0f766e",
      sidebar_color_green: "#c2410c",
      sidebar_menu_accent: "#f97316",
    },
  },
  {
    id: "selva-fest",
    name: "Festividad de la selva",
    description: "Verde tropical con oro festivo y flores",
    colors: {
      primary_color: "#15803d",
      accent_color: "#facc15",
      hero_color_deep: "#14532d",
      hero_color_mid: "#16a34a",
      hero_color_green: "#ca8a04",
      sidebar_color_deep: "#052e16",
      sidebar_color_mid: "#166534",
      sidebar_color_green: "#854d0e",
      sidebar_menu_accent: "#fde047",
    },
  },
  {
    id: "independencia",
    name: "Independencia del Perú",
    description: "Rojo, blanco y rojo como la bandera",
    colors: {
      primary_color: "#D91023",
      accent_color: "#ffffff",
      hero_color_deep: "#D91023",
      hero_color_mid: "#ffffff",
      hero_color_green: "#D91023",
      sidebar_color_deep: "#D91023",
      sidebar_color_mid: "#ffffff",
      sidebar_color_green: "#D91023",
      sidebar_menu_accent: "#ffffff",
    },
  },
  {
    id: "navidad",
    name: "Navidad",
    description: "Verde pino, rojo festivo y dorado",
    colors: {
      primary_color: "#166534",
      accent_color: "#ef4444",
      hero_color_deep: "#14532d",
      hero_color_mid: "#15803d",
      hero_color_green: "#991b1b",
      sidebar_color_deep: "#052e16",
      sidebar_color_mid: "#166534",
      sidebar_color_green: "#7f1d1d",
      sidebar_menu_accent: "#fbbf24",
    },
  },
];

export function paletteMatchesForm(palette: DesignPalette, form: SiteDesignSettings): boolean {
  return (
    palette.colors.primary_color === form.primary_color &&
    palette.colors.hero_color_deep === form.hero_color_deep &&
    palette.colors.sidebar_color_deep === form.sidebar_color_deep
  );
}

export function buildGradientCss(deep: string, mid: string, green: string, angle = 180): string {
  return `linear-gradient(${angle}deg, ${deep} 0%, ${mid} 48%, ${green} 100%)`;
}
