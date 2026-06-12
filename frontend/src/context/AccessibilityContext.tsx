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
  A11Y_PROFILE_PRESETS,
  applyAccessibilityState,
  cycleLevel,
  DEFAULT_A11Y_STATE,
  initAccessibilityState,
  writeAccessibilityState,
  type A11yLevel,
  type A11yProfile,
  type AccessibilityState,
} from "../utils/accessibilityPreference";

type AccessibilityContextValue = {
  state: AccessibilityState;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  cycleSetting: (key: Exclude<keyof AccessibilityState, "profile">) => void;
  applyProfile: (profile: A11yProfile) => void;
  resetAll: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => initAccessibilityState());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    applyAccessibilityState(state);
    writeAccessibilityState(state);
  }, [state]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const updateState = useCallback((next: AccessibilityState) => {
    setState(next);
  }, []);

  const cycleSetting = useCallback(
    (key: Exclude<keyof AccessibilityState, "profile">) => {
      updateState({
        ...state,
        [key]: cycleLevel(state[key] as A11yLevel),
        profile: "none",
      });
    },
    [state, updateState],
  );

  const applyProfile = useCallback(
    (profile: A11yProfile) => {
      if (profile === "none") {
        updateState({ ...DEFAULT_A11Y_STATE });
        return;
      }
      updateState({
        ...A11Y_PROFILE_PRESETS[profile],
        profile,
      });
    },
    [updateState],
  );

  const resetAll = useCallback(() => {
    updateState({ ...DEFAULT_A11Y_STATE });
  }, [updateState]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      state,
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      toggleMenu: () => setMenuOpen((v) => !v),
      cycleSetting,
      applyProfile,
      resetAll,
    }),
    [state, menuOpen, cycleSetting, applyProfile, resetAll],
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility debe usarse dentro de AccessibilityProvider");
  }
  return ctx;
}
