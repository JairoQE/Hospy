/** Minutos sin actividad antes de cerrar sesión automáticamente. */
export const SESSION_IDLE_MINUTES = Number(
  import.meta.env.VITE_SESSION_IDLE_MINUTES ?? 30,
);

export const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000;

/** Intervalo mínimo entre renovaciones de token mientras hay actividad. */
export const SESSION_REFRESH_DEBOUNCE_MS = 2 * 60 * 1000;
