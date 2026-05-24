import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SESSION_IDLE_MINUTES } from "../config/session";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

/** Vigila inactividad y redirige al login cuando expira la sesión. */
export function SessionTimeoutWatcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdleTimeout = useCallback(() => {
    logout();
    navigate("/login", {
      replace: true,
      state: {
        sessionExpired: true,
        message: `Tu sesión expiró tras ${SESSION_IDLE_MINUTES} minutos sin actividad.`,
      },
    });
  }, [logout, navigate]);

  useSessionTimeout(handleIdleTimeout, Boolean(user));

  return null;
}
