import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export interface InboxSummary {
  notificaciones: number;
  mensajes: number;
}

const EMPTY: InboxSummary = { notificaciones: 0, mensajes: 0 };

export function useInboxSummary(pollMs = 45000) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<InboxSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(EMPTY);
      return;
    }
    try {
      const data = await api.get<InboxSummary>("/bandeja/resumen/");
      setSummary(data);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user || pollMs <= 0) return;
    const id = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(id);
  }, [user, pollMs, refresh]);

  return { summary, refresh };
}
