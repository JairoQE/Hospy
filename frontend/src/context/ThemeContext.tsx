import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  initThemePreference,
  readThemePreference,
  writeThemePreference,
  type ThemeMode,
} from "../utils/themePreference";
import { useAuth } from "./AuthContext";

type ThemeContextValue = {
  theme: ThemeMode;
  isDarkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [theme, setTheme] = useState<ThemeMode>(() => initThemePreference());

  useEffect(() => {
    if (loading) return;
    const next = readThemePreference(userId);
    setTheme(next);
    applyTheme(next);
  }, [userId, loading]);

  const setDarkMode = useCallback(
    (enabled: boolean) => {
      const next: ThemeMode = enabled ? "dark" : "light";
      setTheme(next);
      writeThemePreference(userId, next);
    },
    [userId],
  );

  const toggleTheme = useCallback(() => {
    setDarkMode(theme !== "dark");
  }, [setDarkMode, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      setDarkMode,
      toggleTheme,
    }),
    [theme, setDarkMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}
