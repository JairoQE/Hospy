/** Estilos de animación del fondo del hero (portada). */
export type HeroAnimationStyle =
  | "gradient_shift"
  | "mesh"
  | "aurora"
  | "conic"
  | "radial_pulse"
  | "blobs"
  | "particles"
  | "bokeh"
  | "geo_network"
  | "wave_layers"
  | "parallax_waves"
  | "grain"
  | "travel_routes"
  | "floating_pins"
  | "ken_burns"
  | "wave_path"
  | "static";

export const DEFAULT_HERO_ANIMATION_STYLE: HeroAnimationStyle = "gradient_shift";

export const HERO_ANIMATION_STYLE_OPTIONS: {
  value: HeroAnimationStyle;
  label: string;
  hint: string;
  group: string;
}[] = [
  {
    value: "gradient_shift",
    label: "Gradiente deslizante",
    hint: "Clásico Hospy: colores que se desplazan suavemente",
    group: "Gradientes",
  },
  {
    value: "mesh",
    label: "Mesh gradient",
    hint: "Manchas de color difuminadas estilo Apple/Stripe",
    group: "Gradientes",
  },
  {
    value: "aurora",
    label: "Aurora boreal",
    hint: "Franjas luminosas que ondulan en el fondo",
    group: "Gradientes",
  },
  {
    value: "conic",
    label: "Gradiente cónico",
    hint: "Giro lento de colores alrededor del centro",
    group: "Gradientes",
  },
  {
    value: "radial_pulse",
    label: "Pulso radial",
    hint: "Luz central que respira",
    group: "Gradientes",
  },
  {
    value: "ken_burns",
    label: "Ken Burns",
    hint: "Zoom y paneo lento sobre el gradiente",
    group: "Gradientes",
  },
  {
    value: "blobs",
    label: "Blobs orgánicos",
    hint: "Manchas que se deforman y flotan",
    group: "Orgánico",
  },
  {
    value: "grain",
    label: "Grano cinematográfico",
    hint: "Gradiente con textura de ruido sutil",
    group: "Orgánico",
  },
  {
    value: "particles",
    label: "Partículas flotantes",
    hint: "Puntos de luz en movimiento",
    group: "Partículas",
  },
  {
    value: "bokeh",
    label: "Bokeh",
    hint: "Círculos difuminados como luces de ciudad",
    group: "Partículas",
  },
  {
    value: "geo_network",
    label: "Red geográfica",
    hint: "Nodos conectados (conexión a tu destino)",
    group: "Viajes",
  },
  {
    value: "travel_routes",
    label: "Rutas de viaje",
    hint: "Líneas animadas entre puntos",
    group: "Viajes",
  },
  {
    value: "floating_pins",
    label: "Pins de ubicación",
    hint: "Marcadores flotando suavemente",
    group: "Viajes",
  },
  {
    value: "wave_layers",
    label: "Capas de olas",
    hint: "Olas semitransparentes en el fondo",
    group: "Olas",
  },
  {
    value: "parallax_waves",
    label: "Olas parallax",
    hint: "Varias olas a distinta velocidad",
    group: "Olas",
  },
  {
    value: "wave_path",
    label: "Ola del divisor animada",
    hint: "La curva inferior blanca se mueve",
    group: "Olas",
  },
  {
    value: "static",
    label: "Estático",
    hint: "Gradiente fijo sin movimiento",
    group: "Otros",
  },
];

export function normalizeHeroAnimationStyle(value: string | undefined | null): HeroAnimationStyle {
  const found = HERO_ANIMATION_STYLE_OPTIONS.find((o) => o.value === value);
  return found?.value ?? DEFAULT_HERO_ANIMATION_STYLE;
}

export const HERO_ANIMATION_STYLE_GROUPS = [
  ...new Set(HERO_ANIMATION_STYLE_OPTIONS.map((o) => o.group)),
];
