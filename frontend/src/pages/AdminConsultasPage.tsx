import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  fetchConversationMessages,
  fetchMessageReports,
  fetchPlatformConversations,
  resolveMessageReport,
} from "../api/messaging";
import type { ChatMessage, Conversation, MessageReport } from "../api/types";
import { AdminUsersToastHost, showAdminToast } from "../components/admin/AdminUsersToast";
import { ChatPeerAvatar } from "../components/ChatPeerAvatar";
import { PrimeIcon } from "../components/PrimeIcon";
import {
  computeConsultasMetrics,
  filterConversations,
  filterReports,
  formatAvgResponseHours,
  reasonBadgeClass,
  reportStatusBadgeClass,
  truncateText,
  type ConsultasTab,
  type ConversationActivityFilter,
  type ReportReasonFilter,
  type ReportStatusFilter,
} from "../utils/adminConsultasData";
import { formatDate } from "../utils/format";
import { buildMessengerThread } from "../utils/messengerThread";
import { formatRelativeTime } from "../utils/relativeTime";

const PAGE_SIZES = [10, 25, 50] as const;

type ThreadContext = {
  conversationId: number;
  title: string;
  subtitle: string;
  report?: MessageReport;
};

function MiniAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  return (
    <ChatPeerAvatar
      initial={name}
      photoUrl={photoUrl ?? undefined}
      className="messenger-peer-avatar--sm admin-consultas-mini-avatar"
    />
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="admin-kpi-card">
      <div className="admin-kpi-card-top">
        <span className="admin-kpi-icon">
          <PrimeIcon name={icon} size={18} />
        </span>
      </div>
      <p className="admin-kpi-value">{value}</p>
      <p className="admin-kpi-label">{label}</p>
      {hint && <p className="admin-kpi-sublabel">{hint}</p>}
    </article>
  );
}

function EmptyPanel({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-consultas-empty">
      <PrimeIcon name={icon} size={44} />
      <p className="admin-consultas-empty-title">{title}</p>
      <p className="muted">{hint}</p>
      {action}
    </div>
  );
}

export function AdminConsultasPage() {
  const [tab, setTab] = useState<ConsultasTab>("reportes");
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [reportSearchInput, setReportSearchInput] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<ReportReasonFilter>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>("pendiente");
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [inboxSearchInput, setInboxSearchInput] = useState("");
  const [inboxSearch, setInboxSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ConversationActivityFilter>("all");
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxPageSize, setInboxPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  const [threadCtx, setThreadCtx] = useState<ThreadContext | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setListError("");
    Promise.all([
      fetchMessageReports("todos"),
      fetchPlatformConversations().catch(() => [] as Conversation[]),
    ])
      .then(([allReports, allConversations]) => {
        setReports(allReports);
        setConversations(allConversations);
      })
      .catch(() => setListError("No se pudieron cargar consultas y reportes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () => computeConsultasMetrics(reports, conversations),
    [reports, conversations],
  );

  const filteredReports = useMemo(
    () =>
      filterReports(reports, {
        search: reportSearch,
        reason: reasonFilter,
        status: reportStatusFilter,
      }),
    [reports, reportSearch, reasonFilter, reportStatusFilter],
  );

  const filteredConversations = useMemo(
    () =>
      filterConversations(conversations, {
        search: inboxSearch,
        activity: activityFilter,
      }),
    [conversations, inboxSearch, activityFilter],
  );

  const reportPageCount = Math.max(1, Math.ceil(filteredReports.length / reportPageSize));
  const pagedReports = filteredReports.slice(
    (reportPage - 1) * reportPageSize,
    reportPage * reportPageSize,
  );

  const inboxPageCount = Math.max(1, Math.ceil(filteredConversations.length / inboxPageSize));
  const pagedConversations = filteredConversations.slice(
    (inboxPage - 1) * inboxPageSize,
    inboxPage * inboxPageSize,
  );

  useEffect(() => {
    setReportPage(1);
  }, [reportSearch, reasonFilter, reportStatusFilter, reportPageSize]);

  useEffect(() => {
    setInboxPage(1);
  }, [inboxSearch, activityFilter, inboxPageSize]);

  const openThread = useCallback(async (ctx: ThreadContext) => {
    setThreadCtx(ctx);
    setThreadMessages([]);
    setThreadLoading(true);
    try {
      const msgs = await fetchConversationMessages(ctx.conversationId);
      setThreadMessages(msgs);
    } catch (err) {
      showAdminToast(
        err instanceof ApiError ? err.message : "No se pudo cargar la conversación.",
        "error",
      );
      setThreadCtx(null);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const openReportThread = (report: MessageReport) => {
    const convId = report.conversation_id;
    if (!convId) {
      showAdminToast("Este reporte no tiene conversación vinculada.", "error");
      return;
    }
    void openThread({
      conversationId: convId,
      title: report.accommodation_name || "Conversación",
      subtitle: `${report.reporter_name} reportó a ${report.sender_name}`,
      report,
    });
  };

  const openConversationThread = (conv: Conversation) => {
    void openThread({
      conversationId: conv.id,
      title: conv.accommodation_name,
      subtitle: `${conv.guest_name} · ${conv.owner_name}`,
    });
  };

  const handleResolve = async (id: number, status: "revisado" | "descartado") => {
    try {
      const updated = await resolveMessageReport(id, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSelectedReports((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showAdminToast(
        status === "revisado" ? "Reporte marcado como resuelto." : "Reporte desestimado.",
        "success",
      );
      if (threadCtx?.report?.id === id) {
        setThreadCtx((c) => (c ? { ...c, report: updated } : c));
      }
    } catch (err) {
      showAdminToast(
        err instanceof ApiError ? err.message : "No se pudo actualizar el reporte.",
        "error",
      );
    }
  };

  const handleBulkResolve = async (status: "revisado" | "descartado") => {
    const ids = [...selectedReports].filter((id) => {
      const r = reports.find((x) => x.id === id);
      return r?.status === "pendiente";
    });
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(ids.map((id) => resolveMessageReport(id, { status })));
      const refreshed = await fetchMessageReports("todos");
      setReports(refreshed);
      setSelectedReports(new Set());
      showAdminToast(
        `${ids.length} reporte(s) ${status === "revisado" ? "resueltos" : "desestimados"}.`,
        "success",
      );
    } catch {
      showAdminToast("No se pudieron procesar todos los reportes.", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleReportSelect = (id: number) => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onReportSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setReportSearch(reportSearchInput);
  };

  const onInboxSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setInboxSearch(inboxSearchInput);
  };

  const threadRows = buildMessengerThread(threadMessages);
  const highlightMessageId = threadCtx?.report?.message_id;

  return (
    <div className="admin-page admin-consultas-page">
      <AdminUsersToastHost />

      <header className="admin-consultas-header">
        <div>
          <h1 className="admin-page-title">Centro de moderación</h1>
          <p className="admin-page-sub">
            Reportes de chat, bandeja de conversaciones y herramientas de atención.
          </p>
        </div>
        <div className="admin-users-header-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => load()} disabled={loading}>
            <PrimeIcon name="pi-refresh" size={14} />
            Actualizar
          </button>
          <Link to="/bandeja" className="btn btn-ghost btn-sm">
            <PrimeIcon name="pi-inbox" size={14} />
            Mi bandeja
          </Link>
        </div>
      </header>

      {listError && <p className="form-error admin-consultas-error">{listError}</p>}

      <div className="admin-users-kpi-grid admin-consultas-kpis">
        <KpiCard
          icon="pi-flag"
          label="Reportes pendientes"
          value={loading ? "…" : metrics.pendingReports}
        />
        <KpiCard
          icon="pi-check"
          label="Resueltos hoy"
          value={loading ? "…" : metrics.resolvedToday}
          hint={`${metrics.resolvedThisWeek} esta semana`}
        />
        <KpiCard
          icon="pi-clock"
          label="Tiempo promedio respuesta"
          value={loading ? "…" : formatAvgResponseHours(metrics.avgResponseHours)}
        />
        <KpiCard
          icon="pi-comments"
          label="Conversaciones activas (24 h)"
          value={loading ? "…" : metrics.activeConversations24h}
        />
      </div>

      <div className="admin-users-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`admin-users-tab${tab === "reportes" ? " is-active" : ""}`}
          onClick={() => setTab("reportes")}
        >
          <PrimeIcon name="pi-flag" size={14} />
          Reportes pendientes
          <span className="admin-users-tab-count">{metrics.pendingReports}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={`admin-users-tab${tab === "bandeja" ? " is-active" : ""}`}
          onClick={() => setTab("bandeja")}
        >
          <PrimeIcon name="pi-comments" size={14} />
          Bandeja de conversaciones
          <span className="admin-users-tab-count">{conversations.length}</span>
        </button>
      </div>

      {tab === "reportes" && (
        <>
          <div className="admin-users-toolbar-card">
            <form className="admin-users-toolbar" onSubmit={onReportSearchSubmit}>
              <div className="admin-users-search">
                <PrimeIcon name="pi-search" size={16} />
                <input
                  type="search"
                  value={reportSearchInput}
                  onChange={(e) => setReportSearchInput(e.target.value)}
                  placeholder="Buscar por usuario, hospedaje o palabra clave"
                  aria-label="Buscar reportes"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Buscar
              </button>
            </form>
            <div className="admin-users-toolbar-filters admin-consultas-filters">
              <label className="admin-users-filter">
                <span>Motivo</span>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value as ReportReasonFilter)}
                >
                  <option value="all">Todos</option>
                  <option value="acoso">Acoso</option>
                  <option value="spam">Spam</option>
                  <option value="ofensivo">Ofensivo</option>
                  <option value="estafa">Estafa</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label className="admin-users-filter">
                <span>Estado</span>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value as ReportStatusFilter)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="revisado">Resuelto</option>
                  <option value="descartado">Desestimado</option>
                  <option value="all">Todos</option>
                </select>
              </label>
              <label className="admin-users-filter">
                <span>Por página</span>
                <select
                  value={reportPageSize}
                  onChange={(e) =>
                    setReportPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])
                  }
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {selectedReports.size > 0 && (
            <div className="admin-consultas-bulk-bar">
              <span>{selectedReports.size} seleccionado(s)</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={bulkLoading}
                onClick={() => void handleBulkResolve("revisado")}
              >
                Resolver selección
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={bulkLoading}
                onClick={() => void handleBulkResolve("descartado")}
              >
                Desestimar selección
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedReports(new Set())}
              >
                Limpiar
              </button>
            </div>
          )}

          {loading ? (
            <p className="muted admin-consultas-loading">Cargando reportes…</p>
          ) : filteredReports.length === 0 ? (
            <EmptyPanel
              icon="pi-check-circle"
              title="No hay reportes con estos filtros"
              hint="Revisa la bandeja de conversaciones o cambia el estado del filtro."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab("bandeja")}>
                  Ir a bandeja de conversaciones
                </button>
              }
            />
          ) : (
            <div className="admin-bookings-table-wrap">
              <table className="admin-table admin-table--consultas">
                <thead>
                  <tr>
                    <th aria-label="Seleccionar" />
                    <th>Reportante</th>
                    <th>Usuario reportado</th>
                    <th>Motivo</th>
                    <th>Mensaje</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReports.map((r) => (
                    <tr key={r.id} className={r.status === "pendiente" ? "admin-consultas-row--pending" : ""}>
                      <td>
                        {r.status === "pendiente" && (
                          <input
                            type="checkbox"
                            checked={selectedReports.has(r.id)}
                            onChange={() => toggleReportSelect(r.id)}
                            aria-label={`Seleccionar reporte ${r.id}`}
                          />
                        )}
                      </td>
                      <td>
                        <strong>{r.reporter_name}</strong>
                        <div className="muted admin-consultas-cell-sub">{r.reporter_email}</div>
                      </td>
                      <td>
                        <strong>{r.sender_name}</strong>
                        <div className="muted admin-consultas-cell-sub">{r.sender_email}</div>
                      </td>
                      <td>
                        <span className={`admin-consultas-reason ${reasonBadgeClass(r.reason)}`}>
                          {r.reason_label}
                        </span>
                      </td>
                      <td className="admin-consultas-preview">{truncateText(r.message_body, 56)}</td>
                      <td>
                        <time dateTime={r.created_at}>{formatDate(r.created_at)}</time>
                      </td>
                      <td>
                        <span className={`admin-consultas-status ${reportStatusBadgeClass(r.status)}`}>
                          {r.status_label}
                        </span>
                      </td>
                      <td>
                        <div className="admin-consultas-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openReportThread(r)}
                          >
                            Ver conversación
                          </button>
                          {r.status === "pendiente" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => void handleResolve(r.id, "revisado")}
                              >
                                Resolver
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => void handleResolve(r.id, "descartado")}
                              >
                                Desestimar
                              </button>
                            </>
                          )}
                          <Link
                            to="/admin/usuarios"
                            className="btn btn-ghost btn-sm admin-consultas-danger-link"
                            onClick={() =>
                              showAdminToast(
                                `Gestiona el bloqueo de ${r.sender_name} desde Usuarios.`,
                                "info",
                              )
                            }
                          >
                            Bloquear
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-users-pagination">
                <span className="muted">
                  {filteredReports.length} reporte(s) · página {reportPage} de {reportPageCount}
                </span>
                <div className="admin-users-pagination-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={reportPage <= 1}
                    onClick={() => setReportPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={reportPage >= reportPageCount}
                    onClick={() => setReportPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "bandeja" && (
        <>
          <div className="admin-users-toolbar-card">
            <form className="admin-users-toolbar" onSubmit={onInboxSearchSubmit}>
              <div className="admin-users-search">
                <PrimeIcon name="pi-search" size={16} />
                <input
                  type="search"
                  value={inboxSearchInput}
                  onChange={(e) => setInboxSearchInput(e.target.value)}
                  placeholder="Buscar por usuario, hospedaje o palabra"
                  aria-label="Buscar conversaciones"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Buscar
              </button>
            </form>
            <div className="admin-users-toolbar-filters admin-consultas-filters">
              <label className="admin-users-filter">
                <span>Actividad</span>
                <select
                  value={activityFilter}
                  onChange={(e) =>
                    setActivityFilter(e.target.value as ConversationActivityFilter)
                  }
                >
                  <option value="all">Todas</option>
                  <option value="24h">Últimas 24 h</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                </select>
              </label>
              <label className="admin-users-filter">
                <span>Por página</span>
                <select
                  value={inboxPageSize}
                  onChange={(e) =>
                    setInboxPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])
                  }
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p className="muted admin-consultas-loading">Cargando conversaciones…</p>
          ) : filteredConversations.length === 0 ? (
            <EmptyPanel
              icon="pi-inbox"
              title="No hay conversaciones"
              hint="Aún no hay chats entre huéspedes y propietarios con estos filtros."
            />
          ) : (
            <div className="admin-bookings-table-wrap">
              <table className="admin-table admin-table--consultas">
                <thead>
                  <tr>
                    <th>Participantes</th>
                    <th>Hospedaje</th>
                    <th>Último mensaje</th>
                    <th>Mensajes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedConversations.map((c) => {
                    const active24h =
                      c.last_message_at &&
                      Date.now() - new Date(c.last_message_at).getTime() < 24 * 60 * 60 * 1000;
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="admin-consultas-participants">
                            <MiniAvatar name={c.guest_name} photoUrl={c.guest_photo_url} />
                            <span className="admin-consultas-participants-names">
                              <strong>{c.guest_name}</strong>
                              <span className="muted"> · </span>
                              <strong>{c.owner_name}</strong>
                            </span>
                          </div>
                        </td>
                        <td>{c.accommodation_name}</td>
                        <td className="admin-consultas-preview">
                          {c.last_message_at && (
                            <time className="admin-consultas-cell-sub" dateTime={c.last_message_at}>
                              {formatRelativeTime(c.last_message_at)}
                            </time>
                          )}
                          <div>{truncateText(c.last_message_preview || "—", 64)}</div>
                        </td>
                        <td>
                          <span className="admin-users-tab-count">{c.message_count ?? "—"}</span>
                        </td>
                        <td>
                          <span
                            className={`admin-consultas-status ${
                              active24h
                                ? "admin-consultas-status--activo"
                                : "admin-consultas-status--archivado"
                            }`}
                          >
                            {active24h ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-consultas-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openConversationThread(c)}
                            >
                              Ver historial
                            </button>
                            <Link to="/bandeja" className="btn btn-ghost btn-sm">
                              Responder
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="admin-users-pagination">
                <span className="muted">
                  {filteredConversations.length} conversación(es) · página {inboxPage} de{" "}
                  {inboxPageCount}
                </span>
                <div className="admin-users-pagination-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={inboxPage <= 1}
                    onClick={() => setInboxPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={inboxPage >= inboxPageCount}
                    onClick={() => setInboxPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {threadCtx && (
        <div
          className="admin-users-drawer-overlay"
          role="presentation"
          onClick={() => setThreadCtx(null)}
        >
          <aside
            className="admin-users-drawer admin-consultas-drawer"
            role="dialog"
            aria-label="Hilo de conversación"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-users-drawer-header admin-consultas-drawer-header">
              <div>
                <h2>{threadCtx.title}</h2>
                <p className="muted">{threadCtx.subtitle}</p>
              </div>
              <button
                type="button"
                className="messenger-header-icon messenger-header-icon--close"
                onClick={() => setThreadCtx(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            {threadCtx.report && (
              <div className="admin-consultas-report-banner">
                <span className={`admin-consultas-reason ${reasonBadgeClass(threadCtx.report.reason)}`}>
                  {threadCtx.report.reason_label}
                </span>
                <p>{truncateText(threadCtx.report.detail || threadCtx.report.message_body, 160)}</p>
                <span className={`admin-consultas-status ${reportStatusBadgeClass(threadCtx.report.status)}`}>
                  {threadCtx.report.status_label}
                </span>
              </div>
            )}

            <div className="messenger-thread admin-consultas-thread">
              {threadLoading && (
                <div className="messenger-thread-empty">
                  <p>Cargando mensajes…</p>
                </div>
              )}
              {!threadLoading &&
                threadRows.map((row) => {
                  if (row.type === "day") {
                    return (
                      <div key={row.key} className="messenger-day">
                        <span>{row.label}</span>
                      </div>
                    );
                  }
                  const { message, showAvatar, tail } = row;
                  const highlighted = highlightMessageId === message.id;
                  return (
                    <div
                      key={row.key}
                      className={`messenger-row messenger-row--in${tail ? " messenger-row--tail" : ""}${
                        highlighted ? " admin-consultas-msg--highlight" : ""
                      }`}
                    >
                      <div className="messenger-row-avatar">
                        {showAvatar ? (
                          <ChatPeerAvatar
                            initial={message.sender_name}
                            photoUrl={message.sender_photo_url}
                          />
                        ) : null}
                      </div>
                      <div className="messenger-bubble-wrap">
                        <div className="messenger-bubble-row">
                          <div className="messenger-bubble">
                            <span className="admin-consultas-sender-label">{message.sender_name}</span>
                            {message.body}
                          </div>
                        </div>
                        {tail && (
                          <time className="messenger-time" dateTime={message.created_at}>
                            {formatRelativeTime(message.created_at)}
                          </time>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <footer className="admin-consultas-drawer-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  showAdminToast("Se registró una advertencia al usuario (simulado).", "info")
                }
              >
                Advertir
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm admin-consultas-danger-btn"
                onClick={() =>
                  showAdminToast("Eliminar mensaje requiere política adicional (no disponible).", "info")
                }
              >
                Eliminar mensaje
              </button>
              {threadCtx.report?.status === "pendiente" && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleResolve(threadCtx.report!.id, "revisado")}
                  >
                    Cerrar reporte
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void handleResolve(threadCtx.report!.id, "descartado")}
                  >
                    Desestimar
                  </button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
