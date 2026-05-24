import { useEffect, useRef } from "react";
import { refreshAccessToken } from "../api/client";
import {
  SESSION_IDLE_MS,
  SESSION_REFRESH_DEBOUNCE_MS,
} from "../config/session";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Cierra la sesión tras SESSION_IDLE_MS sin actividad del usuario.
 * Con actividad, renueva el JWT de forma periódica para mantener la sesión abierta.
 */
export function useSessionTimeout(
  onIdleTimeout: () => void,
  enabled: boolean,
) {
  const onIdleTimeoutRef = useRef(onIdleTimeout);
  onIdleTimeoutRef.current = onIdleTimeout;

  useEffect(() => {
    if (!enabled) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let lastTokenRefresh = 0;

    const scheduleIdleLogout = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => onIdleTimeoutRef.current(), SESSION_IDLE_MS);
    };

    const onActivity = () => {
      scheduleIdleLogout();

      const now = Date.now();
      if (now - lastTokenRefresh < SESSION_REFRESH_DEBOUNCE_MS) return;
      lastTokenRefresh = now;
      void refreshAccessToken();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener("hospy:activity", onActivity);
    scheduleIdleLogout();

    return () => {
      clearTimeout(idleTimer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener("hospy:activity", onActivity);
    };
  }, [enabled]);
}
