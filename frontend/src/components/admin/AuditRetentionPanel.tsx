import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AuditRetentionInfo } from "../../api/auditLog";
import { PrimeIcon } from "../PrimeIcon";
import { showAdminToast } from "./AdminUsersToast";

export function AuditRetentionPanel() {
  const [info, setInfo] = useState<AuditRetentionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<AuditRetentionInfo>("/audit-logs/retencion/")
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = async () => {
    if (
      !info ||
      (info.expired_pending_archive === 0 && info.archived_pending_purge === 0)
    ) {
      showAdminToast("No hay registros pendientes de archivar o eliminar.", "info");
      return;
    }
    const ok = window.confirm(
      `Se archivarán ${info.expired_pending_archive} registro(s) vencido(s) y se eliminarán ${info.archived_pending_purge} archivado(s) antiguo(s). ¿Continuar?`,
    );
    if (!ok) return;

    setRunning(true);
    try {
      const result = await api.post<AuditRetentionInfo & { archived: number; purged: number }>(
        "/audit-logs/retencion/ejecutar/",
        {},
      );
      setInfo(result);
      showAdminToast(
        `Retención ejecutada: ${result.archived} archivados, ${result.purged} eliminados.`,
        "success",
      );
    } catch {
      showAdminToast("No se pudo ejecutar la retención.", "error");
    } finally {
      setRunning(false);
    }
  };

  if (loading && !info) {
    return (
      <section className="admin-audit-retention-card">
        <p className="muted admin-audit-retention-loading">Cargando política de retención…</p>
      </section>
    );
  }

  if (!info) return null;

  return (
    <section className="admin-audit-retention-card" aria-label="Retención y archivado">
      <header className="admin-audit-retention-head">
        <div>
          <h2 className="admin-audit-retention-title">
            <PrimeIcon name="pi-database" size={18} />
            Retención y archivado
          </h2>
          <p className="muted admin-audit-retention-desc">
            Los registros activos se archivan automáticamente a los{" "}
            <strong>{info.retention_days}</strong> días. Los archivados se eliminan tras{" "}
            <strong>{info.purge_archived_days || "∞"}</strong> días (tarea diaria 04:00).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={runNow}
          disabled={running}
        >
          <PrimeIcon name="pi-box" size={14} />
          {running ? "Ejecutando…" : "Archivar ahora"}
        </button>
      </header>

      <dl className="admin-audit-retention-stats">
        <div>
          <dt>Activos</dt>
          <dd>{info.active_count.toLocaleString("es-PE")}</dd>
        </div>
        <div>
          <dt>Archivados</dt>
          <dd>{info.archived_count.toLocaleString("es-PE")}</dd>
        </div>
        <div>
          <dt>Pendientes de archivar</dt>
          <dd className={info.expired_pending_archive > 0 ? "admin-audit-retention-warn" : ""}>
            {info.expired_pending_archive.toLocaleString("es-PE")}
          </dd>
        </div>
        <div>
          <dt>Pendientes de eliminar</dt>
          <dd className={info.archived_pending_purge > 0 ? "admin-audit-retention-warn" : ""}>
            {info.archived_pending_purge.toLocaleString("es-PE")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
