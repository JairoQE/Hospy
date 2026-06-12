export type A11yLevel = 0 | 1 | 2 | 3;

export type A11yProfile = "none" | "lowVision" | "dyslexia" | "adhd" | "colorBlind";

export type AccessibilityState = {
  textSize: A11yLevel;
  contrast: A11yLevel;
  cursor: A11yLevel;
  readingMask: A11yLevel;
  dyslexia: A11yLevel;
  lineHeight: A11yLevel;
  profile: A11yProfile;
};

const STORAGE_KEY = "hospy-a11y";

export const DEFAULT_A11Y_STATE: AccessibilityState = {
  textSize: 0,
  contrast: 0,
  cursor: 0,
  readingMask: 0,
  dyslexia: 0,
  lineHeight: 0,
  profile: "none",
};

export const A11Y_PROFILE_PRESETS: Record<
  Exclude<A11yProfile, "none">,
  Omit<AccessibilityState, "profile">
> = {
  lowVision: {
    textSize: 2,
    contrast: 2,
    cursor: 1,
    readingMask: 0,
    dyslexia: 0,
    lineHeight: 1,
  },
  dyslexia: {
    textSize: 1,
    contrast: 0,
    cursor: 0,
    readingMask: 0,
    dyslexia: 2,
    lineHeight: 2,
  },
  adhd: {
    textSize: 0,
    contrast: 0,
    cursor: 1,
    readingMask: 2,
    dyslexia: 0,
    lineHeight: 1,
  },
  colorBlind: {
    textSize: 0,
    contrast: 2,
    cursor: 0,
    readingMask: 0,
    dyslexia: 0,
    lineHeight: 0,
  },
};

function clampLevel(value: unknown): A11yLevel {
  const n = Number(value);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return 0;
}

function parseProfile(value: unknown): A11yProfile {
  if (
    value === "lowVision" ||
    value === "dyslexia" ||
    value === "adhd" ||
    value === "colorBlind"
  ) {
    return value;
  }
  return "none";
}

export function readAccessibilityState(): AccessibilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_A11Y_STATE };
    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      textSize: clampLevel(parsed.textSize),
      contrast: clampLevel(parsed.contrast),
      cursor: clampLevel(parsed.cursor),
      readingMask: clampLevel(parsed.readingMask),
      dyslexia: clampLevel(parsed.dyslexia),
      lineHeight: clampLevel(parsed.lineHeight),
      profile: parseProfile(parsed.profile),
    };
  } catch {
    return { ...DEFAULT_A11Y_STATE };
  }
}

export function writeAccessibilityState(state: AccessibilityState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function applyAccessibilityState(state: AccessibilityState): void {
  const root = document.documentElement;
  root.dataset.a11yTextSize = String(state.textSize);
  root.dataset.a11yContrast = String(state.contrast);
  root.dataset.a11yCursor = String(state.cursor);
  root.dataset.a11yReadingMask = String(state.readingMask);
  root.dataset.a11yDyslexia = String(state.dyslexia);
  root.dataset.a11yLineHeight = String(state.lineHeight);
  root.dataset.a11yProfile = state.profile;
}

export function initAccessibilityState(): AccessibilityState {
  const state = readAccessibilityState();
  applyAccessibilityState(state);
  return state;
}

export function cycleLevel(current: A11yLevel): A11yLevel {
  return ((current + 1) % 4) as A11yLevel;
}
