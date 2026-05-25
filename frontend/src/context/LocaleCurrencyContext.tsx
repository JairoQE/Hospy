import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  translate,
  translateTemplate,
  type Currency,
  type Language,
} from "../i18n/translations";
import {
  getLocaleCurrencyConfig,
  initLocaleCurrencyConfig,
  setLocaleCurrencyConfig,
  type LocaleCurrencyConfig,
} from "../utils/localeCurrencyConfig";

type LocaleCurrencyContextValue = {
  language: Language;
  currency: Currency;
  penPerUsd: number;
  setLanguage: (lang: Language) => void;
  setCurrency: (cur: Currency) => void;
  t: (key: string) => string;
  tVars: (key: string, vars: Record<string, string | number>) => string;
};

const LocaleCurrencyContext = createContext<LocaleCurrencyContextValue | null>(null);

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  listeners.forEach((l) => l());
}

function getSnapshot(): LocaleCurrencyConfig {
  return getLocaleCurrencyConfig();
}

initLocaleCurrencyConfig();

export function LocaleCurrencyProvider({ children }: { children: ReactNode }) {
  const cfg = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLanguage = useCallback((lang: Language) => {
    setLocaleCurrencyConfig({ language: lang });
    emitChange();
  }, []);

  const setCurrency = useCallback((cur: Currency) => {
    setLocaleCurrencyConfig({ currency: cur });
    emitChange();
  }, []);

  const value = useMemo<LocaleCurrencyContextValue>(
    () => ({
      language: cfg.language,
      currency: cfg.currency,
      penPerUsd: cfg.penPerUsd,
      setLanguage,
      setCurrency,
      t: (key: string) => translate(key, cfg.language),
      tVars: (key: string, vars: Record<string, string | number>) =>
        translateTemplate(key, cfg.language, vars),
    }),
    [cfg.language, cfg.currency, cfg.penPerUsd, setLanguage, setCurrency],
  );

  return (
    <LocaleCurrencyContext.Provider value={value}>
      {children}
    </LocaleCurrencyContext.Provider>
  );
}

export function useLocaleCurrency(): LocaleCurrencyContextValue {
  const ctx = useContext(LocaleCurrencyContext);
  if (!ctx) {
    throw new Error("useLocaleCurrency debe usarse dentro de LocaleCurrencyProvider");
  }
  return ctx;
}
