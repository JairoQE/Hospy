import { useState } from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import type { Language } from "../../i18n/translations";
import type { A11yLevel, A11yProfile } from "../../utils/accessibilityPreference";
import { IconClose } from "../icons";

type AccordionId = "language" | "profile" | null;

type ToolKey =
  | "textSize"
  | "contrast"
  | "cursor"
  | "readingMask"
  | "dyslexia"
  | "lineHeight";

const A11Y_LANGUAGES: { value: Language; labelKey: string; flag: string }[] = [
  { value: "es-PE", labelKey: "a11y.langEs", flag: "🇵🇪" },
  { value: "en", labelKey: "a11y.langEn", flag: "🇺🇸" },
  { value: "qu", labelKey: "a11y.langQu", flag: "🇵🇪" },
];

const PROFILES: { id: A11yProfile; labelKey: string; icon: string }[] = [
  { id: "lowVision", labelKey: "a11y.profileLowVision", icon: "👁" },
  { id: "dyslexia", labelKey: "a11y.profileDyslexia", icon: "Aa" },
  { id: "adhd", labelKey: "a11y.profileAdhd", icon: "◎" },
  { id: "colorBlind", labelKey: "a11y.profileColorBlind", icon: "◐" },
];

const TOOLS: { key: ToolKey; labelKey: string; icon: string }[] = [
  { key: "textSize", labelKey: "a11y.textSize", icon: "Tt" },
  { key: "contrast", labelKey: "a11y.contrast", icon: "◑" },
  { key: "cursor", labelKey: "a11y.cursor", icon: "↖" },
  { key: "readingMask", labelKey: "a11y.readingMask", icon: "▭" },
  { key: "dyslexia", labelKey: "a11y.dyslexiaFriendly", icon: "AZ" },
  { key: "lineHeight", labelKey: "a11y.lineHeight", icon: "≡" },
];

function LevelBars({ level }: { level: A11yLevel }) {
  return (
    <div className="a11y-level-bars" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`a11y-level-bar${i < level ? " is-active" : ""}`} />
      ))}
    </div>
  );
}

function currentLanguageLabel(language: Language, t: (key: string) => string): string {
  if (language === "en") return t("a11y.langEn");
  if (language === "qu") return t("a11y.langQu");
  return t("a11y.langEs");
}

export function AccessibilityMenu() {
  const { menuOpen, closeMenu, state, cycleSetting, applyProfile, resetAll } =
    useAccessibility();
  const { language, setLanguage, t } = useLocaleCurrency();
  const [openSection, setOpenSection] = useState<AccordionId>(null);

  if (!menuOpen) return null;

  const toggleSection = (id: AccordionId) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  return createPortal(
    <>
      <button
        type="button"
        className="a11y-backdrop"
        aria-label={t("a11y.close")}
        onClick={closeMenu}
      />
      <aside
        id="a11y-menu-panel"
        className="a11y-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-panel-title"
      >
        <header className="a11y-panel-head">
          <svg className="a11y-panel-head-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="6" r="2.2" fill="currentColor" />
            <path
              fill="currentColor"
              d="M7 11.5c0-.8.7-1.5 1.5-1.5h9c.8 0 1.5.7 1.5 1.5v1c0 .8-.7 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 7 12.5v-1z"
            />
          </svg>
          <h2 id="a11y-panel-title" className="a11y-panel-title">
            {t("a11y.title")}
          </h2>
          <button
            type="button"
            className="a11y-panel-close"
            onClick={closeMenu}
            aria-label={t("a11y.close")}
          >
            <IconClose size={22} />
          </button>
        </header>

        <div className="a11y-panel-body">
          <div className="a11y-accordion">
            <button
              type="button"
              className="a11y-accordion-trigger"
              aria-expanded={openSection === "language"}
              onClick={() => toggleSection("language")}
            >
              <span>
                {t("a11y.language")}: {currentLanguageLabel(language, t)}
              </span>
              <span className={`a11y-chevron${openSection === "language" ? " is-open" : ""}`}>
                ▾
              </span>
            </button>
            {openSection === "language" && (
              <div className="a11y-accordion-panel">
                {A11Y_LANGUAGES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`a11y-option-row${language === item.value ? " is-selected" : ""}`}
                    onClick={() => setLanguage(item.value)}
                  >
                    <span className="a11y-option-flag" aria-hidden="true">
                      {item.flag}
                    </span>
                    <span>{t(item.labelKey)}</span>
                    {language === item.value && (
                      <span className="a11y-option-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="a11y-accordion">
            <button
              type="button"
              className="a11y-accordion-trigger"
              aria-expanded={openSection === "profile"}
              onClick={() => toggleSection("profile")}
            >
              <span>{t("a11y.profile")}</span>
              <span className={`a11y-chevron${openSection === "profile" ? " is-open" : ""}`}>
                ▾
              </span>
            </button>
            {openSection === "profile" && (
              <div className="a11y-accordion-panel">
                {PROFILES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`a11y-option-row${state.profile === item.id ? " is-selected" : ""}`}
                    onClick={() =>
                      applyProfile(state.profile === item.id ? "none" : item.id)
                    }
                  >
                    <span className="a11y-option-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="a11y-tools-grid">
            {TOOLS.map((tool) => {
              const level = state[tool.key];
              return (
                <button
                  key={tool.key}
                  type="button"
                  className={`a11y-tool-card${level > 0 ? " is-active" : ""}`}
                  onClick={() => cycleSetting(tool.key)}
                  aria-label={`${t(tool.labelKey)}: ${t("a11y.level")} ${level}`}
                >
                  <span className="a11y-tool-icon" aria-hidden="true">
                    {tool.icon}
                  </span>
                  <span className="a11y-tool-label">{t(tool.labelKey)}</span>
                  <LevelBars level={level} />
                </button>
              );
            })}
          </div>

          <button type="button" className="a11y-reset-btn" onClick={resetAll}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="a11y-reset-icon">
              <path
                fill="currentColor"
                d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.8 2.8l1.5 1.5C19.6 13.1 20 11.6 20 10c0-4.4-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6 0-1 .3-2 .8-2.8L5.3 7.7C4.4 8.9 4 10.4 4 12c0 4.4 3.6 8 8 8v3l4-4-4-4v3z"
              />
            </svg>
            {t("a11y.reset")}
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
