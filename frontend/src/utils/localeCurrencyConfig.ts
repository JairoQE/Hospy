import type { Currency, Language } from "../i18n/translations";

export type LocaleCurrencyConfig = {
  language: Language;
  currency: Currency;
  /** Cuántos soles (PEN) equivalen a 1 USD para mostrar precios convertidos. */
  penPerUsd: number;
};

const STORAGE_LANG = "hospy-language";
const STORAGE_CURRENCY = "hospy-currency";

const DEFAULT_RATE = Number(import.meta.env.VITE_PEN_PER_USD ?? "3.75") || 3.75;

let config: LocaleCurrencyConfig = {
  language: loadLanguage(),
  currency: loadCurrency(),
  penPerUsd: DEFAULT_RATE,
};

function loadLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_LANG) ?? sessionStorage.getItem(STORAGE_LANG);
    if (v === "en" || v === "es-PE") return v;
  } catch {
    /* ignore */
  }
  return "es-PE";
}

function loadCurrency(): Currency {
  try {
    const v =
      localStorage.getItem(STORAGE_CURRENCY) ??
      sessionStorage.getItem(STORAGE_CURRENCY);
    if (v === "USD" || v === "PEN") return v;
  } catch {
    /* ignore */
  }
  return "PEN";
}

export function getLocaleCurrencyConfig(): LocaleCurrencyConfig {
  return config;
}

export function setLocaleCurrencyConfig(next: Partial<LocaleCurrencyConfig>): LocaleCurrencyConfig {
  config = { ...config, ...next };
  if (next.language) {
    document.documentElement.lang = next.language.startsWith("es") ? "es" : "en";
    try {
      localStorage.setItem(STORAGE_LANG, next.language);
      sessionStorage.setItem(STORAGE_LANG, next.language);
    } catch {
      /* ignore */
    }
  }
  if (next.currency) {
    try {
      localStorage.setItem(STORAGE_CURRENCY, next.currency);
      sessionStorage.setItem(STORAGE_CURRENCY, next.currency);
    } catch {
      /* ignore */
    }
  }
  return config;
}

export function initLocaleCurrencyConfig(): LocaleCurrencyConfig {
  config = {
    language: loadLanguage(),
    currency: loadCurrency(),
    penPerUsd: DEFAULT_RATE,
  };
  document.documentElement.lang = config.language.startsWith("es") ? "es" : "en";
  return config;
}
