export type ThemeMode = "light" | "dark";

const LEGACY_KEY = "hospy-theme";
const GUEST_KEY = "hospy-theme:guest";
const SCOPE_KEY = "hospy-theme-scope";

function userKey(userId: number): string {
  return `hospy-theme:user:${userId}`;
}

export function themeStorageKey(userId: number | null | undefined): string {
  return userId ? userKey(userId) : GUEST_KEY;
}

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function parseTheme(value: string | null): ThemeMode | null {
  if (value === "dark" || value === "light") return value;
  return null;
}

export function readThemePreference(userId: number | null | undefined): ThemeMode {
  try {
    const key = themeStorageKey(userId);
    const saved = parseTheme(localStorage.getItem(key));
    if (saved) return saved;

    if (!userId) {
      const legacy = parseTheme(localStorage.getItem(LEGACY_KEY));
      if (legacy) {
        localStorage.setItem(GUEST_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
        return legacy;
      }
    }

    return systemPrefersDark() ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeThemePreference(
  userId: number | null | undefined,
  theme: ThemeMode,
): void {
  try {
    localStorage.setItem(themeStorageKey(userId), theme);
    sessionStorage.setItem(SCOPE_KEY, userId ? String(userId) : "guest");
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
}

export function readStoredThemeScope(): string | null {
  try {
    return sessionStorage.getItem(SCOPE_KEY);
  } catch {
    return null;
  }
}

/** Aplica el tema guardado antes de montar React (misma clave por usuario/invitado). */
export function initThemePreference(): ThemeMode {
  try {
    const scope = readStoredThemeScope();
    let key = GUEST_KEY;
    if (scope && scope !== "guest") {
      key = userKey(Number(scope));
    }

    let saved = parseTheme(localStorage.getItem(key));
    if (!saved && !scope) {
      saved = parseTheme(localStorage.getItem(LEGACY_KEY));
    }

    const theme = saved ?? (systemPrefersDark() ? "dark" : "light");
    applyTheme(theme);
    return theme;
  } catch {
    applyTheme("light");
    return "light";
  }
}
