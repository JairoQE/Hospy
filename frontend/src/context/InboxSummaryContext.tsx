import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

export interface InboxSummary {
  notificaciones: number;
  mensajes: number;
}

const EMPTY: InboxSummary = { notificaciones: 0, mensajes: 0 };

const POLL_MS = 25_000;

type InboxSummaryContextValue = {
  summary: InboxSummary;
  refresh: () => Promise<void>;
};

const InboxSummaryContext = createContext<InboxSummaryContextValue | null>(null);

export function InboxSummaryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [summary, setSummary] = useState<InboxSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(EMPTY);
      return;
    }
    try {
      const data = await api.get<InboxSummary>("/bandeja/resumen/");
      setSummary({
        notificaciones: Number(data.notificaciones) || 0,
        mensajes: Number(data.mensajes) || 0,
      });
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [location.pathname, location.search, user, refresh]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refresh]);

  const value = useMemo(
    () => ({
      summary,
      refresh,
    }),
    [summary, refresh],
  );

  return (
    <InboxSummaryContext.Provider value={value}>{children}</InboxSummaryContext.Provider>
  );
}

export function useInboxSummary() {
  const ctx = useContext(InboxSummaryContext);
  if (!ctx) {
    throw new Error("useInboxSummary debe usarse dentro de InboxSummaryProvider");
  }
  return ctx;
}
