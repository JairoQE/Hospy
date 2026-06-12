import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../../../api/client";
import {
  HERO_ANIMATION_STYLE_GROUPS,
  HERO_ANIMATION_STYLE_OPTIONS,
  type HeroAnimationStyle,
} from "../../../api/heroAnimationStyles";
import {
  DEFAULT_SITE_DESIGN,
  applySiteDesignToDocument,
  resolveSidebarColors,
  type SiteAnimationSpeed,
  type SiteBorderRadius,
  type SiteChartStyle,
  type SiteDesignSettings,
} from "../../../api/siteDesign";
import { HeroBackground } from "../../home/HeroBackground";
import { ChartStylePreview } from "../../charts/ChartStylePreview";
import { ChartStyleSelector } from "../../charts/ChartStyleSelector";
import { normalizeChartStyle, type ChartStyleId } from "../../charts/chartStyles";
import { persistChartStyle } from "../../../utils/chartStyleStorage";
import { showAdminToast } from "../AdminUsersToast";
import { PrimeIcon } from "../../PrimeIcon";
import { useSiteDesign } from "../../../context/SiteDesignContext";
import {
  buildGradientCss,
  DESIGN_PALETTES,
  paletteMatchesForm,
} from "../../../utils/siteDesignPalettes";

const RADIUS_OPTIONS: { value: SiteBorderRadius; label: string }[] = [
  { value: "sm", label: "Compacto" },
  { value: "md", label: "Estándar" },
  { value: "lg", label: "Redondeado" },
];

const SPEED_OPTIONS: { value: SiteAnimationSpeed; label: string; hint: string }[] = [
  { value: "slow", label: "Lenta", hint: "22 s — movimiento muy suave" },
  { value: "normal", label: "Normal", hint: "14 s — equilibrio recomendado" },
  { value: "fast", label: "Rápida", hint: "8 s — gradiente más dinámico" },
];

type AnimToggleProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function AnimToggle({ label, hint, checked, onChange }: AnimToggleProps) {
  return (
    <label className="admin-home-toggle-row admin-design-toggle">
      <span>
        {label}
        {hint && <span className="muted admin-design-toggle-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="admin-home-toggle"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

type ColorFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

function ColorField({ label, hint, value, onChange, disabled }: ColorFieldProps) {
  return (
    <label className={`admin-design-color-field${disabled ? " is-disabled" : ""}`}>
      <span className="admin-design-color-label">{label}</span>
      <div className="admin-design-color-input-row">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="admin-design-hex"
          spellCheck={false}
        />
      </div>
      {hint && <span className="muted admin-design-hint">{hint}</span>}
    </label>
  );
}

function GradientPreview({
  deep,
  mid,
  green,
  animated,
  className = "",
  angle = 180,
}: {
  deep: string;
  mid: string;
  green: string;
  animated?: boolean;
  className?: string;
  angle?: number;
}) {
  return (
    <div
      className={`admin-design-gradient-preview${animated ? " is-animated" : ""} ${className}`.trim()}
      style={{ backgroundImage: buildGradientCss(deep, mid, green, angle) }}
      aria-hidden
    />
  );
}

function SidebarPreview({
  deep,
  mid,
  green,
  accent,
  animated,
}: {
  deep: string;
  mid: string;
  green: string;
  accent: string;
  animated: boolean;
}) {
  return (
    <div className="admin-design-sidebar-preview">
      <GradientPreview
        deep={deep}
        mid={mid}
        green={green}
        animated={animated}
        className="admin-design-sidebar-preview-bg"
      />
      <div className="admin-design-sidebar-preview-inner">
        <span className="admin-design-sidebar-preview-brand">Hospy</span>
        <span className="admin-design-sidebar-preview-link">Dashboard</span>
        <span className="admin-design-sidebar-preview-link is-active" style={{ borderColor: accent }}>
          Configuración
        </span>
        <span className="admin-design-sidebar-preview-link">Reservas</span>
      </div>
    </div>
  );
}

export function AdminDesignPanel() {
  const { design, save } = useSiteDesign();
  const [form, setForm] = useState<SiteDesignSettings>(design);
  const [saving, setSaving] = useState(false);
  const [hoverChartStyle, setHoverChartStyle] = useState<ChartStyleId | null>(null);

  const previewChartStyle = normalizeChartStyle(hoverChartStyle ?? form.chart_style);

  useEffect(() => {
    setForm(design);
  }, [design]);

  useEffect(() => {
    applySiteDesignToDocument(form);
    return () => applySiteDesignToDocument(design);
  }, [form, design]);

  const sidebarColors = useMemo(() => resolveSidebarColors(form), [form]);

  const patch = <K extends keyof SiteDesignSettings>(key: K, value: SiteDesignSettings[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "chart_style") {
        persistChartStyle(normalizeChartStyle(String(value)));
      }
      return next;
    });
  };

  const applyPalette = (palette: (typeof DESIGN_PALETTES)[number]) => {
    setForm((prev) => ({
      ...prev,
      ...palette.colors,
      sidebar_sync_hero: false,
    }));
    showAdminToast(`Paleta «${palette.name}» aplicada. Guarda para publicar.`, "info");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        hero_color_deep: form.hero_color_deep,
        hero_color_mid: form.hero_color_mid,
        hero_color_green: form.hero_color_green,
        sidebar_color_deep: form.sidebar_color_deep,
        sidebar_color_mid: form.sidebar_color_mid,
        sidebar_color_green: form.sidebar_color_green,
        sidebar_menu_accent: form.sidebar_menu_accent,
        sidebar_sync_hero: form.sidebar_sync_hero,
        hero_animated: form.hero_animated,
        hero_animation_style: form.hero_animation_style,
        sidebar_animated: form.sidebar_animated,
        home_entrance_animated: form.home_entrance_animated,
        browse_marquee_animated: form.browse_marquee_animated,
        animation_speed: form.animation_speed,
        border_radius: form.border_radius,
        chart_style: form.chart_style,
      });
      showAdminToast("Diseño guardado. Home, menú y gráficos actualizados.", "success");
    } catch (err) {
      showAdminToast(err instanceof ApiError ? err.message : "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setForm({ ...DEFAULT_SITE_DESIGN });
  };

  return (
    <div className="admin-design-panel">
      <form className="admin-design-form" onSubmit={onSubmit}>
        <div className="admin-design-layout admin-design-layout--wide">
          <div className="admin-design-fields">
            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-palette" size={18} />
                Paletas recomendadas
              </h2>
              <p className="muted admin-design-section-sub">
                Combinaciones armónicas para el hero con ola animada y el menú lateral del admin.
                Haz clic para probar; luego guarda.
              </p>
              <div className="admin-design-palette-grid">
                {DESIGN_PALETTES.map((palette) => {
                  const active = paletteMatchesForm(palette, form);
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      className={`admin-design-palette-card${active ? " is-active" : ""}`}
                      onClick={() => applyPalette(palette)}
                    >
                      <GradientPreview
                        deep={palette.colors.sidebar_color_deep}
                        mid={palette.colors.sidebar_color_mid}
                        green={palette.colors.sidebar_color_green}
                        animated
                        className="admin-design-palette-swatch"
                        angle={135}
                      />
                      <span className="admin-design-palette-name">{palette.name}</span>
                      <span className="muted admin-design-palette-desc">{palette.description}</span>
                      <span
                        className="admin-design-palette-accent-dot"
                        style={{ background: palette.colors.sidebar_menu_accent }}
                        title="Acento menú"
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-bars" size={18} />
                Menú lateral (admin)
              </h2>
              <p className="muted admin-design-section-sub">
                Gradiente animado de la barra izquierda del panel de administración.
              </p>
              <label className="admin-home-toggle-row admin-design-toggle">
                <span>Usar los mismos colores que el hero del inicio</span>
                <input
                  type="checkbox"
                  className="admin-home-toggle"
                  checked={form.sidebar_sync_hero}
                  onChange={(e) => patch("sidebar_sync_hero", e.target.checked)}
                />
              </label>
              <div className="admin-design-color-grid">
                <ColorField
                  label="Tono superior"
                  value={form.sidebar_sync_hero ? form.hero_color_deep : form.sidebar_color_deep}
                  disabled={form.sidebar_sync_hero}
                  onChange={(v) => patch("sidebar_color_deep", v)}
                />
                <ColorField
                  label="Tono central"
                  value={form.sidebar_sync_hero ? form.hero_color_mid : form.sidebar_color_mid}
                  disabled={form.sidebar_sync_hero}
                  onChange={(v) => patch("sidebar_color_mid", v)}
                />
                <ColorField
                  label="Tono inferior"
                  value={form.sidebar_sync_hero ? form.hero_color_green : form.sidebar_color_green}
                  disabled={form.sidebar_sync_hero}
                  onChange={(v) => patch("sidebar_color_green", v)}
                />
                <ColorField
                  label="Acento ítem activo"
                  hint="Línea lateral al seleccionar una opción"
                  value={form.sidebar_menu_accent}
                  onChange={(v) => patch("sidebar_menu_accent", v)}
                />
              </div>
            </section>

            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-image" size={18} />
                Hero del inicio
              </h2>
              <p className="muted admin-design-section-sub">
                Fondo de la portada pública: colores y estilo de animación del hero.
              </p>
              <label className="admin-users-filter admin-design-hero-style">
                <span>Estilo de animación del hero</span>
                <select
                  value={form.hero_animation_style}
                  onChange={(e) =>
                    patch("hero_animation_style", e.target.value as HeroAnimationStyle)
                  }
                >
                  {HERO_ANIMATION_STYLE_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {HERO_ANIMATION_STYLE_OPTIONS.filter((o) => o.group === group).map(
                        (o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ))}
                </select>
                <span className="muted admin-design-hint">
                  {
                    HERO_ANIMATION_STYLE_OPTIONS.find(
                      (o) => o.value === form.hero_animation_style,
                    )?.hint
                  }
                </span>
              </label>
              <div className="admin-design-color-grid">
                <ColorField
                  label="Tono profundo"
                  value={form.hero_color_deep}
                  onChange={(v) => patch("hero_color_deep", v)}
                />
                <ColorField
                  label="Tono medio"
                  value={form.hero_color_mid}
                  onChange={(v) => patch("hero_color_mid", v)}
                />
                <ColorField
                  label="Tono claro / verde"
                  value={form.hero_color_green}
                  onChange={(v) => patch("hero_color_green", v)}
                />
                <ColorField
                  label="Palabra destacada"
                  hint="Ej. «estancia» en el título"
                  value={form.accent_color}
                  onChange={(v) => patch("accent_color", v)}
                />
              </div>
            </section>

            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-sync" size={18} />
                Animaciones
              </h2>
              <p className="muted admin-design-section-sub">
                Activa o desactiva movimientos del sitio. Los cambios se ven al instante en la vista previa.
              </p>
              <div className="admin-design-anim-list">
                <AnimToggle
                  label="Animación del hero (inicio)"
                  hint="Activa o pausa el estilo elegido arriba"
                  checked={form.hero_animated}
                  onChange={(v) => patch("hero_animated", v)}
                />
                <AnimToggle
                  label="Gradiente del menú lateral"
                  hint="Barra izquierda del panel admin"
                  checked={form.sidebar_animated}
                  onChange={(v) => patch("sidebar_animated", v)}
                />
                <AnimToggle
                  label="Aparición suave de secciones"
                  hint="Fade-in al cargar bloques del home"
                  checked={form.home_entrance_animated}
                  onChange={(v) => patch("home_entrance_animated", v)}
                />
                <AnimToggle
                  label="Carrusel de exploración"
                  hint="Desplazamiento automático de tarjetas"
                  checked={form.browse_marquee_animated}
                  onChange={(v) => patch("browse_marquee_animated", v)}
                />
              </div>
              <label className="admin-users-filter admin-design-speed">
                <span>Velocidad de gradientes (hero y menú)</span>
                <select
                  value={form.animation_speed}
                  onChange={(e) => patch("animation_speed", e.target.value as SiteAnimationSpeed)}
                >
                  {SPEED_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} — {o.hint}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-chart-bar" size={18} />
                Estilos de gráficos
              </h2>
              <p className="muted admin-design-section-sub">
                Apariencia de barras, áreas y donas en los dashboards. Organizados por categoría;
                pasa el cursor para previsualizar. Luego guarda.
              </p>
              <ChartStyleSelector
                value={normalizeChartStyle(form.chart_style)}
                onChange={(style) => patch("chart_style", style as SiteChartStyle)}
                onHoverPreview={setHoverChartStyle}
              />
            </section>

            <section className="admin-design-section">
              <h2 className="admin-design-section-title">
                <PrimeIcon name="pi-circle" size={18} />
                Botones y forma
              </h2>
              <div className="admin-design-color-grid">
                <ColorField
                  label="Color primario"
                  hint="Botones Buscar, enlaces, CTAs"
                  value={form.primary_color}
                  onChange={(v) => patch("primary_color", v)}
                />
              </div>
              <label className="admin-users-filter admin-design-radius">
                <span>Redondeo de tarjetas</span>
                <select
                  value={form.border_radius}
                  onChange={(e) => patch("border_radius", e.target.value as SiteBorderRadius)}
                >
                  {RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <footer className="admin-design-footer">
              <button type="button" className="btn btn-ghost" onClick={resetDefaults}>
                Restaurar Hospy original
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar diseño"}
              </button>
            </footer>
          </div>

          <aside className="admin-design-preview" aria-label="Vista previa del diseño">
            <p className="admin-design-preview-label">Vista previa en vivo</p>

            <p className="admin-design-preview-caption">Menú lateral</p>
            <SidebarPreview
              deep={sidebarColors.deep}
              mid={sidebarColors.mid}
              green={sidebarColors.green}
              accent={form.sidebar_menu_accent}
              animated={form.sidebar_animated}
            />

            <p className="admin-design-preview-caption">Hero del inicio</p>
            <div className="admin-design-hero-preview-wrap">
              <HeroBackground
                deep={form.hero_color_deep}
                mid={form.hero_color_mid}
                green={form.hero_color_green}
                style={form.hero_animation_style}
                animated={form.hero_animated}
                className="admin-design-hero-preview-bg"
              />
              <div className="admin-design-hero-preview-content">
                <span className="admin-design-preview-title">
                  Encuentra tu próxima{" "}
                  <em style={{ color: form.accent_color, fontStyle: "normal" }}>estancia</em>
                </span>
                <span
                  className="admin-design-preview-btn"
                  style={{ backgroundColor: form.primary_color }}
                >
                  Buscar
                </span>
              </div>
            </div>

            <p className="admin-design-preview-caption">Gráficos del dashboard</p>
            <div className="admin-design-chart-style-preview admin-design-chart-live-preview">
              <ChartStylePreview styleId={previewChartStyle} variant="full" />
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
