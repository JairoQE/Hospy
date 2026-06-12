import { api } from "./client";
import {
  DEFAULT_HERO_ANIMATION_STYLE,
  type HeroAnimationStyle,
} from "./heroAnimationStyles";

export type SiteBorderRadius = "sm" | "md" | "lg";
export type SiteAnimationSpeed = "slow" | "normal" | "fast";
export type SiteChartStyle =
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

export const ANIM_SPEED_SECONDS: Record<
  SiteAnimationSpeed,
  { hero: number; sidebar: number }
> = {
  slow: { hero: 22, sidebar: 22 },
  normal: { hero: 14, sidebar: 14 },
  fast: { hero: 8, sidebar: 8 },
};

export interface SiteDesignSettings {
  primary_color: string;
  accent_color: string;
  hero_color_deep: string;
  hero_color_mid: string;
  hero_color_green: string;
  sidebar_color_deep: string;
  sidebar_color_mid: string;
  sidebar_color_green: string;
  sidebar_menu_accent: string;
  sidebar_sync_hero: boolean;
  hero_animated: boolean;
  hero_animation_style: HeroAnimationStyle;
  sidebar_animated: boolean;
  home_entrance_animated: boolean;
  browse_marquee_animated: boolean;
  animation_speed: SiteAnimationSpeed;
  border_radius: SiteBorderRadius;
  chart_style: SiteChartStyle;
  updated_at?: string;
}

export const DEFAULT_SITE_DESIGN: SiteDesignSettings = {
  primary_color: "#0d6e6e",
  accent_color: "#f4a261",
  hero_color_deep: "#1e3a5f",
  hero_color_mid: "#2c7da0",
  hero_color_green: "#1d6b5c",
  sidebar_color_deep: "#0f2744",
  sidebar_color_mid: "#1a5f7a",
  sidebar_color_green: "#0d4d4a",
  sidebar_menu_accent: "#f4a261",
  sidebar_sync_hero: true,
  hero_animated: true,
  hero_animation_style: DEFAULT_HERO_ANIMATION_STYLE,
  sidebar_animated: true,
  home_entrance_animated: true,
  browse_marquee_animated: true,
  animation_speed: "normal",
  border_radius: "md",
  chart_style: "flat_professional",
};

export function resolveSidebarColors(settings: SiteDesignSettings) {
  if (settings.sidebar_sync_hero) {
    return {
      deep: settings.hero_color_deep,
      mid: settings.hero_color_mid,
      green: settings.hero_color_green,
    };
  }
  return {
    deep: settings.sidebar_color_deep,
    mid: settings.sidebar_color_mid,
    green: settings.sidebar_color_green,
  };
}

function hexLuminance(hex: string): number | null {
  const n = hex.replace("#", "").trim();
  if (n.length !== 6) return null;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

function isVeryLightColor(hex: string): boolean {
  const lum = hexLuminance(hex);
  return lum != null && lum > 0.82;
}

function darkenHex(hex: string, amount = 0.22): string {
  const n = hex.replace("#", "").trim();
  if (n.length !== 6) return hex;
  const channel = (start: number) => {
    const value = Number.parseInt(n.slice(start, start + 2), 16);
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(255, Math.round(value * (1 - amount))));
  };
  const r = channel(0).toString(16).padStart(2, "0");
  const g = channel(2).toString(16).padStart(2, "0");
  const b = channel(4).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Gradiente del avatar flotante de Hospix según la paleta activa. */
export function resolveHospixBg(settings: SiteDesignSettings): { start: string; end: string } {
  const start = settings.primary_color;
  const candidates = [
    settings.hero_color_deep,
    settings.hero_color_green,
    resolveSidebarColors(settings).deep,
    resolveSidebarColors(settings).green,
  ];

  for (const candidate of candidates) {
    if (
      candidate.toLowerCase() !== start.toLowerCase() &&
      !isVeryLightColor(candidate)
    ) {
      return { start, end: candidate };
    }
  }

  return { start, end: darkenHex(start) };
}

export function fetchSiteDesign() {
  return api.get<SiteDesignSettings>("/diseno/", false);
}

export function updateSiteDesign(payload: Partial<SiteDesignSettings>) {
  return api.patch<SiteDesignSettings>("/diseno/", payload);
}

export const BORDER_RADIUS_PX: Record<SiteBorderRadius, string> = {
  sm: "8px",
  md: "12px",
  lg: "16px",
};

export function applySiteDesignToDocument(settings: SiteDesignSettings) {
  const root = document.documentElement;
  const sidebar = resolveSidebarColors(settings);

  root.style.setProperty("--primary", settings.primary_color);
  root.style.setProperty("--primary-hover", settings.primary_color);
  root.style.setProperty("--home-deep", settings.hero_color_deep);
  root.style.setProperty("--home-turquoise", settings.hero_color_mid);
  root.style.setProperty("--home-accent", settings.accent_color);
  root.style.setProperty("--home-radius-lg", BORDER_RADIUS_PX[settings.border_radius]);
  root.style.setProperty("--home-radius-hero", settings.border_radius === "lg" ? "24px" : "20px");
  root.style.setProperty("--site-hero-green", settings.hero_color_green);

  root.style.setProperty("--sidebar-deep", sidebar.deep);
  root.style.setProperty("--sidebar-mid", sidebar.mid);
  root.style.setProperty("--sidebar-green", sidebar.green);
  root.style.setProperty("--sidebar-menu-accent", settings.sidebar_menu_accent);

  const hospixBg = resolveHospixBg(settings);
  root.style.setProperty("--hospix-bg-start", hospixBg.start);
  root.style.setProperty("--hospix-bg-end", hospixBg.end);

  const speed = ANIM_SPEED_SECONDS[settings.animation_speed] ?? ANIM_SPEED_SECONDS.normal;
  root.style.setProperty("--hero-gradient-duration", `${speed.hero}s`);
  root.style.setProperty("--sidebar-gradient-duration", `${speed.sidebar}s`);

  root.dataset.heroAnimated = settings.hero_animated ? "1" : "0";
  root.dataset.heroAnimationStyle = settings.hero_animation_style ?? DEFAULT_HERO_ANIMATION_STYLE;
  root.dataset.sidebarAnimated = settings.sidebar_animated ? "1" : "0";
  root.dataset.homeEntrance = settings.home_entrance_animated ? "1" : "0";
  root.dataset.browseMarquee = settings.browse_marquee_animated ? "1" : "0";
  root.dataset.animSpeed = settings.animation_speed;
  root.dataset.chartStyle = settings.chart_style ?? "flat_professional";
}
