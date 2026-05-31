import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import {
  buildAuditLogAlertsQuery,
  type AuditAlertsResponse,
  type AuditLogEntry,
} from "../api/auditLog";
import { showAdminToast } from "../components/admin/AdminUsersToast";

const STORAGE_KEY = "hospy_audit_last_seen_id";
const POLL_MS = 30_000;

function readLastSeenId(): number {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function writeLastSeenId(id: number) {
  sessionStorage.setItem(STORAGE_KEY, String(id));
}

export function markAuditAlertsSeen(latestId?: number) {
  if (latestId != null && latestId > 0) {
    writeLastSeenId(latestId);
    return;
  }
  api
    .get<AuditAlertsResponse>("/audit-logs/alertas/")
    .then((data) => {
      if (data.latest_id > 0) writeLastSeenId(data.latest_id);
    })
    .catch(() => {});
}

export function useAuditAlerts(enabled: boolean) {
  const [pending, setPending] = useState<AuditLogEntry[]>([]);
  const [latestId, setLatestId] = useState(0);
  const initialized = useRef(false);

  const poll = useCallback(async () => {
    if (!enabled) return;
    const afterId = readLastSeenId();
    const qs = buildAuditLogAlertsQuery(afterId);
    const data = await api.get<AuditAlertsResponse>(`/audit-logs/alertas${qs}`);

    setLatestId(data.latest_id);

    if (!initialized.current) {
      initialized.current = true;
      if (afterId <= 0 && data.latest_id > 0) {
        writeLastSeenId(data.latest_id);
      }
      return;
    }

    if (data.alerts.length > 0) {
      setPending((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const merged = [...prev];
        for (const alert of data.alerts) {
          if (!ids.has(alert.id)) merged.push(alert);
        }
        return merged;
      });
      for (const alert of data.alerts) {
        const tone = alert.severity === "critical" ? "error" : "info";
        showAdminToast(
          `${alert.severity === "critical" ? "Crítico" : "Alerta"}: ${alert.action_label} — ${alert.actor_name || alert.actor_email || "Sistema"}`,
          tone,
        );
      }
      if (data.latest_id > 0) writeLastSeenId(data.latest_id);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPending([]);
      return;
    }
    initialized.current = false;
    poll().catch(() => {});
    const timer = window.setInterval(() => {
      poll().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, poll]);

  const dismiss = useCallback(() => {
    setPending([]);
    if (latestId > 0) writeLastSeenId(latestId);
    else markAuditAlertsSeen();
  }, [latestId]);

  return { pending, dismiss, latestId };
}
