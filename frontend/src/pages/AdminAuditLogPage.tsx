import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { ApiError, api } from "../api/client";
import {
  buildAuditLogQuery,
  type AuditLogEntry,
  type AuditLogListResponse,
  type AuditSummary,
} from "../api/auditLog";
import type { UserRole } from "../api/types";
import { showAdminToast } from "../components/admin/AdminUsersToast";
import { AuditLogDetailPanel } from "../components/admin/AuditLogDetailPanel";
import { AdminGeoInsightsPanel } from "../components/geo/AdminGeoInsightsPanel";
import { AuditRetentionPanel } from "../components/admin/AuditRetentionPanel";
import { PrimeIcon } from "../components/PrimeIcon";
import { markAuditAlertsSeen } from "../hooks/useAuditAlerts";
import {
  buildAuditFilters,
  CATEGORY_LABELS,
  exportAuditCsv,
  metadataPreview,
  SEVERITY_LABELS,
  type AuditCategory,
  type AuditPeriod,
  type AuditSeverity,
} from "../utils/adminAuditData";
import { formatDate, roleLabel } from "../utils/format";
import { formatLastAccessRelative } from "../utils/relativeTime";

const PAGE_SIZE = 25;

type RoleFilter = UserRole | "all";
type SeverityFilter = AuditSeverity | "all";
type ArchiveFilter = "active" | "archived";

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  hint?: string;
  tone?: "warn" | "danger";
}) {
  return (
    <article className={`admin-kpi-card${tone ? ` admin-kpi-card--${tone}` : ""}`}>
      <div className="admin-kpi-card-top">
        <span className="admin-kpi-icon">
          <PrimeIcon name={icon} size={18} />
        </span>
      </div>
      <p className="admin-kpi-value">{value.toLocaleString("es-PE")}</p>
      <p className="admin-kpi-label">{label}</p>
      {hint && <p className="admin-kpi-sublabel">{hint}</p>}
    </article>
  );
}

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <span className={`admin-audit-severity admin-audit-severity--${severity}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<AuditPeriod>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    search ||
    roleFilter !== "all" ||
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    periodFilter !== "all" ||
    archiveFilter === "archived";

  const loadSummary = useCallback(() => {
    api
      .get<AuditSummary>("/audit-logs/resumen/")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const qs = buildAuditLogQuery(
      buildAuditFilters({
        search,
        role: roleFilter,
        category: categoryFilter,
        severity: severityFilter,
        period: periodFilter,
        page,
        pageSize: PAGE_SIZE,
        archived: archiveFilter === "archived",
      }),
    );
    api
      .get<AuditLogListResponse>(`/audit-logs${qs}`)
      .then((data) => {
        setRows(data.results ?? []);
        setTotal(data.count ?? 0);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "No se pudieron cargar los registros.");
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter, categoryFilter, severityFilter, periodFilter, archiveFilter, page]);

  useEffect(() => {
    loadSummary();
    markAuditAlertsSeen();
  }, [loadSummary]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, categoryFilter, severityFilter, periodFilter, archiveFilter]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setPeriodFilter("all");
    setArchiveFilter("active");
  };

  const exportCurrent = async () => {
    if (rows.length === 0) {
      showAdminToast("No hay filas para exportar.", "info");
      return;
    }
    try {
      const qs = buildAuditLogQuery({
        ...buildAuditFilters({
          search,
          role: roleFilter,
          category: categoryFilter,
          severity: severityFilter,
          period: periodFilter,
          page: 1,
          pageSize: 200,
          archived: archiveFilter === "archived",
        }),
        page_size: 200,
      });
      const data = await api.get<AuditLogListResponse>(`/audit-logs${qs}`);
      const toExport = data.results ?? rows;
      exportAuditCsv(toExport);
      showAdminToast(`Exportados ${toExport.length} registros (máx. 200).`, "success");
    } catch {
      exportAuditCsv(rows);
      showAdminToast("Exportada la página actual.", "info");
    }
  };

  return (
    <div className="admin-page admin-audit-page">
      <AuditLogDetailPanel entry={selected} onClose={() => setSelected(null)} />

      <header className="admin-users-header">
        <div>
          <h1 className="admin-page-title">Auditoría del sistema</h1>
          <p className="admin-page-sub">
            Trazabilidad completa de acciones sensibles: quién hizo qué, sobre qué recurso y
            cuándo. Registros inmutables para investigación y cumplimiento.
          </p>
        </div>
        <div className="admin-audit-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={exportCurrent}
            disabled={loading || rows.length === 0}
          >
            <PrimeIcon name="pi-download" size={14} />
            Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              load();
              loadSummary();
              showAdminToast("Registros actualizados.", "info");
            }}
            disabled={loading}
          >
            <PrimeIcon name="pi-refresh" size={14} />
            Actualizar
          </button>
        </div>
      </header>

      {summary && (
        <section className="admin-users-kpi-grid admin-audit-kpi-grid" aria-label="Métricas de auditoría">
          <KpiCard icon="pi-database" label="Total de eventos" value={summary.total} hint="Desde el inicio" />
          <KpiCard icon="pi-clock" label="Últimas 24 h" value={summary.last_24h} />
          <KpiCard icon="pi-calendar" label="Últimos 7 días" value={summary.last_7d} />
          <KpiCard
            icon="pi-exclamation-triangle"
            label="Eventos críticos"
            value={summary.critical_events}
            hint="Seguridad y gobernanza"
            tone="danger"
          />
          <KpiCard
            icon="pi-shield"
            label="Acciones de admin"
            value={summary.admin_actions}
            hint="Rol administrador"
            tone="warn"
          />
        </section>
      )}

      <AuditRetentionPanel />

      <AdminGeoInsightsPanel />

      <div className="admin-users-toolbar-card admin-audit-toolbar">
        <form className="admin-users-toolbar" onSubmit={handleSearch} role="search">
          <div className="admin-users-search admin-audit-search">
            <span className="admin-users-search-icon" aria-hidden>
              <PrimeIcon name="pi-search" size={16} />
            </span>
            <input
              type="search"
              placeholder="Buscar por usuario, correo, IP, acción u objeto…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar en registros"
            />
          </div>
          <div className="admin-users-toolbar-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Buscar
            </button>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        </form>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Registros</span>
          {(
            [
              ["active", "Activos"],
              ["archived", "Archivados"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${archiveFilter === id ? " is-active" : ""}`}
              onClick={() => setArchiveFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Periodo</span>
          {(
            [
              ["all", "Todo"],
              ["24h", "24 h"],
              ["7d", "7 días"],
              ["30d", "30 días"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${periodFilter === id ? " is-active" : ""}`}
              onClick={() => setPeriodFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Severidad</span>
          {(["all", "critical", "high", "medium", "low"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip admin-audit-chip-severity${severityFilter === id ? " is-active" : ""}${id !== "all" ? ` admin-audit-chip-severity--${id}` : ""}`}
              onClick={() => setSeverityFilter(id)}
            >
              {id === "all" ? "Todas" : SEVERITY_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Rol del actor</span>
          {(
            [
              ["all", "Todos"],
              ["administrador", "Administradores"],
              ["propietario", "Propietarios"],
              ["huesped", "Huéspedes"],
              ["patrocinador", "Patrocinadores"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${roleFilter === id ? " is-active" : ""}`}
              onClick={() => setRoleFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Área</span>
          {(Object.keys(CATEGORY_LABELS) as AuditCategory[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${categoryFilter === id ? " is-active" : ""}`}
              onClick={() => setCategoryFilter(id)}
            >
              {CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <p className="admin-loading">Cargando registro de auditoría…</p>}

      {!loading && !error && (
        <section className="admin-users-table-card admin-audit-table-card">
          {rows.length === 0 ? (
            <div className="admin-users-empty">
              <PrimeIcon name="pi-inbox" size={40} />
              <p className="admin-users-empty-title">Sin eventos</p>
              <p className="muted">
                No hay registros que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <>
              <div className="admin-audit-table-head">
                <p className="admin-audit-summary">
                  Mostrando <strong>{rows.length}</strong> de{" "}
                  <strong>{total.toLocaleString("es-PE")}</strong> eventos
                  {hasFilters && " (filtrado)"}
                </p>
                <p className="muted admin-audit-table-hint">Clic en una fila para ver el detalle completo</p>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--audit">
                  <thead>
                    <tr>
                      <th>Severidad</th>
                      <th>Fecha / hora</th>
                      <th>Actor</th>
                      <th>Acción</th>
                      <th>Recurso</th>
                      <th>Resumen</th>
                      <th aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`admin-audit-row admin-audit-row--${entry.severity}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelected(entry)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(entry);
                          }
                        }}
                      >
                        <td>
                          <SeverityBadge severity={entry.severity} />
                        </td>
                        <td className="admin-audit-date">
                          <span className="admin-audit-date-main">
                            {formatLastAccessRelative(entry.created_at)}
                          </span>
                          <span className="admin-audit-date-sub muted">
                            {formatDate(entry.created_at)}
                          </span>
                        </td>
                        <td className="admin-audit-actor">
                          <strong>{entry.actor_name || "Sistema"}</strong>
                          <span className="admin-audit-email muted">{entry.actor_email || "—"}</span>
                          {entry.actor_role && (
                            <span className="admin-audit-role-tag">
                              {roleLabel(entry.actor_role as UserRole)}
                            </span>
                          )}
                        </td>
                        <td className="admin-audit-action">{entry.action_label}</td>
                        <td className="admin-audit-target">
                          <span className="admin-audit-target-label">
                            {entry.target_label || "—"}
                          </span>
                          <span className="admin-audit-target-type muted">
                            {entry.target_type}
                            {entry.target_id ? ` #${entry.target_id}` : ""}
                          </span>
                        </td>
                        <td className="admin-audit-meta">{metadataPreview(entry)}</td>
                        <td className="admin-audit-chevron" aria-hidden>
                          <PrimeIcon name="pi-chevron-right" size={14} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="admin-users-pagination">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <span className="muted">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
