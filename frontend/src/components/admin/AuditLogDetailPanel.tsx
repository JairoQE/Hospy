import type { AuditLogEntry } from "../../api/auditLog";
import { PrimeIcon } from "../PrimeIcon";
import { formatDate, roleLabel } from "../../utils/format";
import type { UserRole } from "../../api/types";
import {
  auditCategoryIcon,
  formatAuditMetadata,
  SEVERITY_LABELS,
  type AuditSeverity,
} from "../../utils/adminAuditData";

type Props = {
  entry: AuditLogEntry | null;
  onClose: () => void;
};

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <span className={`admin-audit-severity admin-audit-severity--${severity}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function AuditLogDetailPanel({ entry, onClose }: Props) {
  if (!entry) return null;

  const metaLines = formatAuditMetadata(entry);

  return (
    <div
      className="admin-audit-drawer-overlay"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="admin-audit-drawer"
        role="dialog"
        aria-labelledby="audit-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-audit-drawer-header">
          <div>
            <p className="admin-audit-drawer-eyebrow">Evento #{entry.id}</p>
            <h2 id="audit-detail-title">{entry.action_label}</h2>
          </div>
          <button type="button" className="map-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="admin-audit-drawer-body">
          <section className="admin-audit-detail-block">
            <h3>Resumen</h3>
            <dl className="admin-audit-dl">
              <div>
                <dt>Fecha y hora</dt>
                <dd>{formatDate(entry.created_at)}</dd>
              </div>
              <div>
                <dt>Severidad</dt>
                <dd>
                  <SeverityBadge severity={entry.severity} />
                </dd>
              </div>
              <div>
                <dt>Código de acción</dt>
                <dd>
                  <code className="admin-audit-code">{entry.action}</code>
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-audit-detail-block">
            <h3>Actor</h3>
            <dl className="admin-audit-dl">
              <div>
                <dt>Nombre</dt>
                <dd>{entry.actor_name || "Sistema / no identificado"}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{entry.actor_email || "—"}</dd>
              </div>
              <div>
                <dt>Rol en Hospy</dt>
                <dd>
                  {entry.actor_role
                    ? roleLabel(entry.actor_role as UserRole)
                    : "—"}
                </dd>
              </div>
              {entry.ip_address && (
                <div>
                  <dt>Dirección IP</dt>
                  <dd>
                    <code className="admin-audit-code">{entry.ip_address}</code>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="admin-audit-detail-block">
            <h3>Objeto afectado</h3>
            <div className="admin-audit-target-card">
              <span className="admin-audit-target-icon" aria-hidden>
                <PrimeIcon name={auditCategoryIcon(entry.category)} size={18} />
              </span>
              <div>
                <strong>{entry.target_label || "Sin etiqueta"}</strong>
                <span className="muted">
                  {entry.target_type}
                  {entry.target_id ? ` · ID ${entry.target_id}` : ""}
                </span>
              </div>
            </div>
          </section>

          {metaLines.length > 0 && (
            <section className="admin-audit-detail-block">
              <h3>Detalle del cambio</h3>
              <ul className="admin-audit-meta-list">
                {metaLines.map((line) => (
                  <li key={`${line.label}-${line.value}`}>
                    <span className="admin-audit-meta-label">{line.label}</span>
                    <span className="admin-audit-meta-value">{line.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {entry.user_agent && (
            <section className="admin-audit-detail-block">
              <h3>Cliente</h3>
              <p className="admin-audit-user-agent">{entry.user_agent}</p>
            </section>
          )}

          <section className="admin-audit-detail-block admin-audit-detail-block--muted">
            <p className="muted admin-audit-compliance-note">
              Registro append-only con fines de trazabilidad. Conserva correlación entre actor,
              acción y objeto para investigaciones de seguridad o cumplimiento.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
