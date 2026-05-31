import { Link } from "react-router-dom";
import { PrimeIcon } from "../PrimeIcon";
import type { AuditLogEntry } from "../../api/auditLog";
import { SEVERITY_LABELS } from "../../utils/adminAuditData";

type Props = {
  alerts: AuditLogEntry[];
  onDismiss: () => void;
};

export function AuditAlertsBanner({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div
      className={`admin-audit-alerts-banner${criticalCount > 0 ? " admin-audit-alerts-banner--critical" : ""}`}
      role="alert"
    >
      <div className="admin-audit-alerts-banner-body">
        <span className="admin-audit-alerts-icon" aria-hidden>
          <PrimeIcon name="pi-bell" size={18} />
        </span>
        <div>
          <strong>
            {alerts.length === 1
              ? "Nuevo evento de seguridad"
              : `${alerts.length} eventos de seguridad recientes`}
          </strong>
          <ul className="admin-audit-alerts-list">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                <span className={`admin-audit-severity admin-audit-severity--${a.severity}`}>
                  {SEVERITY_LABELS[a.severity]}
                </span>
                {a.action_label}
                {a.actor_name ? ` · ${a.actor_name}` : ""}
              </li>
            ))}
            {alerts.length > 3 && (
              <li className="muted">+{alerts.length - 3} más…</li>
            )}
          </ul>
        </div>
      </div>
      <div className="admin-audit-alerts-actions">
        <Link to="/admin/registro-actividad" className="btn btn-sm btn-primary" onClick={onDismiss}>
          Ver auditoría
        </Link>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onDismiss}>
          Marcar como visto
        </button>
      </div>
    </div>
  );
}
