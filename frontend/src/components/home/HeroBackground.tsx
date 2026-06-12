import type { CSSProperties } from "react";
import {
  normalizeHeroAnimationStyle,
  type HeroAnimationStyle,
} from "../../api/heroAnimationStyles";
import { useSiteDesign } from "../../context/SiteDesignContext";

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 100}%`,
  delay: `${(i % 8) * 0.7}s`,
  duration: `${6 + (i % 5) * 1.4}s`,
  size: `${2 + (i % 3)}px`,
}));

const BOKEH = [
  { w: 120, h: 120, l: "8%", t: "15%", d: "0s" },
  { w: 80, h: 80, l: "72%", t: "8%", d: "2s" },
  { w: 160, h: 160, l: "55%", t: "45%", d: "1s" },
  { w: 90, h: 90, l: "25%", t: "55%", d: "3s" },
  { w: 70, h: 70, l: "85%", t: "60%", d: "1.5s" },
  { w: 110, h: 110, l: "40%", t: "20%", d: "2.5s" },
];

const PINS = [
  { l: "12%", t: "22%", d: "0s" },
  { l: "78%", t: "18%", d: "1.2s" },
  { l: "45%", t: "38%", d: "2.4s" },
  { l: "28%", t: "62%", d: "0.8s" },
  { l: "68%", t: "55%", d: "1.8s" },
  { l: "88%", t: "72%", d: "2s" },
];

type Props = {
  deep?: string;
  mid?: string;
  green?: string;
  style?: HeroAnimationStyle;
  animated?: boolean;
  className?: string;
};

export function HeroBackground({
  deep,
  mid,
  green,
  style,
  animated,
  className = "",
}: Props) {
  const { design } = useSiteDesign();
  const animStyle = normalizeHeroAnimationStyle(style ?? design.hero_animation_style);
  const isAnimated = animated ?? design.hero_animated;
  const effectiveStyle = !isAnimated || animStyle === "static" ? "static" : animStyle;

  const cssVars = {
    "--hero-c-deep": deep ?? design.hero_color_deep,
    "--hero-c-mid": mid ?? design.hero_color_mid,
    "--hero-c-green": green ?? design.hero_color_green,
  } as CSSProperties;

  return (
    <div
      className={`home-hero-background home-hero-background--${effectiveStyle}${className ? ` ${className}` : ""}`}
      style={cssVars}
      aria-hidden
    >
      <div className="home-hero-bg-layer home-hero-bg-layer--base" />

      {effectiveStyle === "mesh" && (
        <>
          <div className="home-hero-bg-layer home-hero-bg-layer--mesh home-hero-bg-layer--mesh-a" />
          <div className="home-hero-bg-layer home-hero-bg-layer--mesh home-hero-bg-layer--mesh-b" />
          <div className="home-hero-bg-layer home-hero-bg-layer--mesh home-hero-bg-layer--mesh-c" />
        </>
      )}

      {effectiveStyle === "aurora" && (
        <>
          <div className="home-hero-bg-layer home-hero-bg-layer--aurora home-hero-bg-layer--aurora-a" />
          <div className="home-hero-bg-layer home-hero-bg-layer--aurora home-hero-bg-layer--aurora-b" />
          <div className="home-hero-bg-layer home-hero-bg-layer--aurora home-hero-bg-layer--aurora-c" />
        </>
      )}

      {effectiveStyle === "conic" && (
        <div className="home-hero-bg-layer home-hero-bg-layer--conic" />
      )}

      {effectiveStyle === "radial_pulse" && (
        <div className="home-hero-bg-layer home-hero-bg-layer--radial-pulse" />
      )}

      {effectiveStyle === "blobs" && (
        <div className="home-hero-blobs">
          <span className="home-hero-blob home-hero-blob--1" />
          <span className="home-hero-blob home-hero-blob--2" />
          <span className="home-hero-blob home-hero-blob--3" />
          <span className="home-hero-blob home-hero-blob--4" />
        </div>
      )}

      {effectiveStyle === "particles" && (
        <div className="home-hero-particles">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="home-hero-particle"
              style={
                {
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {effectiveStyle === "bokeh" && (
        <div className="home-hero-bokeh">
          {BOKEH.map((b, i) => (
            <span
              key={i}
              className="home-hero-bokeh-dot"
              style={
                {
                  width: b.w,
                  height: b.h,
                  left: b.l,
                  top: b.t,
                  animationDelay: b.d,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {(effectiveStyle === "geo_network" || effectiveStyle === "travel_routes") && (
        <svg className="home-hero-svg-layer" viewBox="0 0 1440 400" preserveAspectRatio="none">
          {effectiveStyle === "geo_network" && (
            <>
              <g className="home-hero-network-lines">
                <line x1="120" y1="80" x2="420" y2="160" />
                <line x1="420" y1="160" x2="720" y2="100" />
                <line x1="720" y1="100" x2="980" y2="220" />
                <line x1="980" y1="220" x2="1320" y2="140" />
                <line x1="280" y1="280" x2="620" y2="200" />
                <line x1="620" y1="200" x2="1100" y2="300" />
              </g>
              <g className="home-hero-network-dots">
                <circle cx="120" cy="80" r="5" />
                <circle cx="420" cy="160" r="5" />
                <circle cx="720" cy="100" r="6" />
                <circle cx="980" cy="220" r="5" />
                <circle cx="1320" cy="140" r="5" />
                <circle cx="280" cy="280" r="4" />
                <circle cx="1100" cy="300" r="4" />
              </g>
            </>
          )}
          {effectiveStyle === "travel_routes" && (
            <g className="home-hero-routes">
              <path d="M 80 200 Q 360 80 640 200 T 1200 180" />
              <path d="M 100 300 Q 500 120 900 280 T 1360 240" />
              <path d="M 200 120 Q 700 320 1100 100" />
            </g>
          )}
        </svg>
      )}

      {(effectiveStyle === "wave_layers" || effectiveStyle === "parallax_waves") && (
        <div className="home-hero-wave-stack">
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="home-hero-wave-layer home-hero-wave-layer--1">
            <path d="M0,100 C360,40 720,160 1080,80 C1260,40 1380,60 1440,90 L1440,200 L0,200 Z" />
          </svg>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="home-hero-wave-layer home-hero-wave-layer--2">
            <path d="M0,120 C320,180 640,60 960,130 C1200,180 1320,100 1440,140 L1440,200 L0,200 Z" />
          </svg>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="home-hero-wave-layer home-hero-wave-layer--3">
            <path d="M0,150 C400,90 800,170 1440,110 L1440,200 L0,200 Z" />
          </svg>
        </div>
      )}

      {effectiveStyle === "floating_pins" && (
        <div className="home-hero-pins">
          {PINS.map((p, i) => (
            <span
              key={i}
              className="home-hero-pin"
              style={{ left: p.l, top: p.t, animationDelay: p.d } as CSSProperties}
            >
              <svg viewBox="0 0 24 32" width="22" height="28" aria-hidden>
                <path
                  d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9zm0 12.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
                  fill="currentColor"
                />
              </svg>
            </span>
          ))}
        </div>
      )}

      {effectiveStyle === "grain" && <div className="home-hero-bg-layer home-hero-bg-layer--grain" />}
    </div>
  );
}

export function heroWaveAnimated(style?: HeroAnimationStyle, animated?: boolean): boolean {
  const s = normalizeHeroAnimationStyle(style);
  return Boolean(animated) && s === "wave_path";
}
