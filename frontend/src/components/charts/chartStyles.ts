/** Los 10 estilos oficiales del dashboard Hospy */
export type ChartStyleId =
  | "flat_professional"
  | "glassmorphism"
  | "neon_cyber"
  | "minimalist_lines"
  | "pastel_dreams"
  | "high_contrast"
  | "three_d_extruded"
  | "monochrome_gradient"
  | "hand_drawn"
  | "retro_terminal";

export type ChartStyleCategory =
  | "corporate"
  | "effects"
  | "analyst"
  | "accessibility"
  | "creative";

export type ChartTooltipVariant =
  | "light"
  | "dark"
  | "neon"
  | "glass"
  | "retro"
  | "minimal";

export type ChartStyleDefinition = {
  id: ChartStyleId;
  name: string;
  description: string;
  whenToUse: string;
  category: ChartStyleCategory;
  preview: [string, string, string, string?];
};

export const CHART_STYLE_CATEGORY_LABELS: Record<ChartStyleCategory, string> = {
  corporate: "Corporativo",
  effects: "Efectos especiales",
  analyst: "Analítico",
  accessibility: "Accesibilidad",
  creative: "Creativo",
};

/** Compatibilidad con valores guardados antes de la v2 */
const LEGACY_STYLE_MAP: Record<string, ChartStyleId> = {
  basic: "flat_professional",
  soft: "pastel_dreams",
  stroke: "minimalist_lines",
  three_d: "three_d_extruded",
  neon: "neon_cyber",
  glass: "glassmorphism",
  minimal_eco: "flat_professional",
  high_contrast: "high_contrast",
  pastel_dreams: "pastel_dreams",
  monochrome_pro: "monochrome_gradient",
};

export const CHART_STYLE_OPTIONS: ChartStyleDefinition[] = [
  {
    id: "flat_professional",
    name: "Flat Professional",
    description: "Plano, limpio, corporativo. Sin degradados ni sombras.",
    whenToUse: "Informes ejecutivos e impresión.",
    category: "corporate",
    preview: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
  },
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    description: "Cristal, transparencias y blur moderno.",
    whenToUse: "Dashboards sobre fondo oscuro o con textura.",
    category: "effects",
    preview: ["#6366F1", "#34D399", "#FB923C"],
  },
  {
    id: "neon_cyber",
    name: "Neon Cyber",
    description: "Neón cyberpunk sobre negro azulado.",
    whenToUse: "Paneles nocturnos y métricas en vivo.",
    category: "effects",
    preview: ["#00F3FF", "#FF00EA", "#FFEE00"],
  },
  {
    id: "minimalist_lines",
    name: "Minimalist Lines",
    description: "Solo trazos, sin relleno. Elegante y analítico.",
    whenToUse: "Muchas series superpuestas.",
    category: "analyst",
    preview: ["#2563EB", "#059669", "#D97706"],
  },
  {
    id: "pastel_dreams",
    name: "Pastel Dreams",
    description: "Pasteles suaves, bordes redondeados, sombra tenue.",
    whenToUse: "UX amigable y presentaciones ligeras.",
    category: "creative",
    preview: ["#C5A3FF", "#A3E4D7", "#FFCCB3"],
  },
  {
    id: "high_contrast",
    name: "High Contrast",
    description: "WCAG AAA. Colores puros, sin degradados.",
    whenToUse: "Accesibilidad y baja visión.",
    category: "accessibility",
    preview: ["#0000FF", "#FF0000", "#00AA00"],
  },
  {
    id: "three_d_extruded",
    name: "3D Extruded",
    description: "Barras y donas con profundidad y relieve.",
    whenToUse: "Ventas, bienes raíces, presentaciones.",
    category: "effects",
    preview: ["#4F46E5", "#0D9488", "#EA580C"],
  },
  {
    id: "monochrome_gradient",
    name: "Monochrome Gradient",
    description: "Una familia cromática, variación de luminosidad.",
    whenToUse: "Informes financieros serios.",
    category: "corporate",
    preview: ["#0A2B4E", "#1E40AF", "#BFDBFE"],
  },
  {
    id: "hand_drawn",
    name: "Hand Drawn",
    description: "Estilo boceto, trazos orgánicos y colores marcador.",
    whenToUse: "Agencias creativas y dashboards de diseño.",
    category: "creative",
    preview: ["#FFB347", "#6A4E9B", "#4C9A8A"],
  },
  {
    id: "retro_terminal",
    name: "Retro Terminal",
    description: "Monocromo verde/ámbar, tipografía monospace.",
    whenToUse: "DevOps, servidores, nostalgia retro.",
    category: "creative",
    preview: ["#00FF00", "#39FF14", "#FFB000"],
  },
];

export type ChartStyleTokens = {
  areaFillOpacity: number;
  lineWidth: number;
  showDots: boolean;
  dotRadius: number;
  barRadius: [number, number, number, number];
  barMaxSize: number;
  barFillOpacity: number;
  barOutlineOnly: boolean;
  barStrokeWidth: number;
  floatingBar: boolean;
  use3DBars: boolean;
  use3DCharts: boolean;
  useLineOnly: boolean;
  gridDash: string;
  gridOpacity: number;
  piePadding: number;
  pieStrokeWidth: number;
  curveType: "monotone" | "linear" | "step";
  neonShell: boolean;
  glassShell: boolean;
  premiumGradients: boolean;
  handDrawn: boolean;
  retroTerminal: boolean;
  tooltipVariant: ChartTooltipVariant;
};

const STYLE_TOKENS: Record<ChartStyleId, ChartStyleTokens> = {
  flat_professional: {
    areaFillOpacity: 0.15,
    lineWidth: 2,
    showDots: false,
    dotRadius: 3,
    barRadius: [4, 4, 0, 0],
    barMaxSize: 44,
    barFillOpacity: 1,
    barOutlineOnly: false,
    barStrokeWidth: 0,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "4 6",
    gridOpacity: 1,
    piePadding: 2,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: false,
    glassShell: false,
    premiumGradients: false,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "light",
  },
  glassmorphism: {
    areaFillOpacity: 0.35,
    lineWidth: 2,
    showDots: false,
    dotRadius: 3,
    barRadius: [10, 10, 0, 0],
    barMaxSize: 40,
    barFillOpacity: 0.7,
    barOutlineOnly: false,
    barStrokeWidth: 1,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "6 10",
    gridOpacity: 0.45,
    piePadding: 3,
    pieStrokeWidth: 1,
    curveType: "monotone",
    neonShell: false,
    glassShell: true,
    premiumGradients: true,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "glass",
  },
  neon_cyber: {
    areaFillOpacity: 0.06,
    lineWidth: 2.5,
    showDots: true,
    dotRadius: 5,
    barRadius: [4, 4, 0, 0],
    barMaxSize: 42,
    barFillOpacity: 1,
    barOutlineOnly: true,
    barStrokeWidth: 2,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "2 8",
    gridOpacity: 0.08,
    piePadding: 4,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: true,
    glassShell: false,
    premiumGradients: false,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "neon",
  },
  minimalist_lines: {
    areaFillOpacity: 0,
    lineWidth: 1.5,
    showDots: true,
    dotRadius: 3,
    barRadius: [0, 0, 0, 0],
    barMaxSize: 36,
    barFillOpacity: 0,
    barOutlineOnly: true,
    barStrokeWidth: 1.5,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: true,
    gridDash: "2 6",
    gridOpacity: 0.7,
    piePadding: 4,
    pieStrokeWidth: 2,
    curveType: "linear",
    neonShell: false,
    glassShell: false,
    premiumGradients: false,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "minimal",
  },
  pastel_dreams: {
    areaFillOpacity: 0.3,
    lineWidth: 2,
    showDots: false,
    dotRadius: 3,
    barRadius: [8, 8, 8, 8],
    barMaxSize: 38,
    barFillOpacity: 0.85,
    barOutlineOnly: false,
    barStrokeWidth: 0,
    floatingBar: true,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "4 12",
    gridOpacity: 0.35,
    piePadding: 3,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: false,
    glassShell: false,
    premiumGradients: true,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "light",
  },
  high_contrast: {
    areaFillOpacity: 0.4,
    lineWidth: 3,
    showDots: true,
    dotRadius: 5,
    barRadius: [0, 0, 0, 0],
    barMaxSize: 48,
    barFillOpacity: 1,
    barOutlineOnly: false,
    barStrokeWidth: 2,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "0",
    gridOpacity: 1,
    piePadding: 1,
    pieStrokeWidth: 3,
    curveType: "linear",
    neonShell: false,
    glassShell: false,
    premiumGradients: false,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "dark",
  },
  three_d_extruded: {
    areaFillOpacity: 0.25,
    lineWidth: 2.5,
    showDots: false,
    dotRadius: 3,
    barRadius: [2, 2, 0, 0],
    barMaxSize: 52,
    barFillOpacity: 1,
    barOutlineOnly: false,
    barStrokeWidth: 0,
    floatingBar: false,
    use3DBars: true,
    use3DCharts: true,
    useLineOnly: false,
    gridDash: "3 6",
    gridOpacity: 0.7,
    piePadding: 4,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: false,
    glassShell: false,
    premiumGradients: true,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "light",
  },
  monochrome_gradient: {
    areaFillOpacity: 0.35,
    lineWidth: 2.5,
    showDots: true,
    dotRadius: 3,
    barRadius: [6, 6, 0, 0],
    barMaxSize: 42,
    barFillOpacity: 1,
    barOutlineOnly: false,
    barStrokeWidth: 0,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "2 8",
    gridOpacity: 0.55,
    piePadding: 2,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: false,
    glassShell: false,
    premiumGradients: true,
    handDrawn: false,
    retroTerminal: false,
    tooltipVariant: "light",
  },
  hand_drawn: {
    areaFillOpacity: 0.12,
    lineWidth: 2,
    showDots: true,
    dotRadius: 4,
    barRadius: [6, 6, 2, 2],
    barMaxSize: 40,
    barFillOpacity: 0.9,
    barOutlineOnly: false,
    barStrokeWidth: 2,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "1 8",
    gridOpacity: 0.5,
    piePadding: 3,
    pieStrokeWidth: 2,
    curveType: "monotone",
    neonShell: false,
    glassShell: false,
    premiumGradients: false,
    handDrawn: true,
    retroTerminal: false,
    tooltipVariant: "light",
  },
  retro_terminal: {
    areaFillOpacity: 0.15,
    lineWidth: 2,
    showDots: false,
    dotRadius: 2,
    barRadius: [0, 0, 0, 0],
    barMaxSize: 40,
    barFillOpacity: 1,
    barOutlineOnly: false,
    barStrokeWidth: 0,
    floatingBar: false,
    use3DBars: false,
    use3DCharts: false,
    useLineOnly: false,
    gridDash: "1 4",
    gridOpacity: 0.2,
    piePadding: 2,
    pieStrokeWidth: 1,
    curveType: "linear",
    neonShell: false,
    glassShell: false,
    premiumGradients: false,
    handDrawn: false,
    retroTerminal: true,
    tooltipVariant: "retro",
  },
};

export function normalizeChartStyle(value?: string | null): ChartStyleId {
  if (!value) return "flat_professional";
  if (value in STYLE_TOKENS) return value as ChartStyleId;
  if (value in LEGACY_STYLE_MAP) return LEGACY_STYLE_MAP[value];
  return "flat_professional";
}

export function getChartStyleTokens(style: ChartStyleId): ChartStyleTokens {
  return STYLE_TOKENS[style];
}

export function chartStyleClassName(style: ChartStyleId): string {
  return `chart-style-${style.replace(/_/g, "-")}`;
}

export function chartTooltipClassName(style: ChartStyleId): string {
  const variant = getChartStyleTokens(style).tooltipVariant;
  return `chart-tooltip chart-tooltip--${variant}`;
}

export function chartStylesByCategory(): {
  category: ChartStyleCategory;
  label: string;
  options: ChartStyleDefinition[];
}[] {
  const order: ChartStyleCategory[] = [
    "corporate",
    "analyst",
    "effects",
    "accessibility",
    "creative",
  ];
  return order.map((category) => ({
    category,
    label: CHART_STYLE_CATEGORY_LABELS[category],
    options: CHART_STYLE_OPTIONS.filter((o) => o.category === category),
  }));
}
