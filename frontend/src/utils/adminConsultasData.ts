import type { Conversation, MessageReport } from "../api/types";

export type ConsultasTab = "reportes" | "bandeja";

export type ReportReasonFilter = "all" | "acoso" | "spam" | "ofensivo" | "estafa" | "otro";

export type ReportStatusFilter = "pendiente" | "all" | "revisado" | "descartado";

export type ConversationActivityFilter = "all" | "24h" | "7d" | "30d";

export interface ConsultasMetrics {
  pendingReports: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  avgResponseHours: number | null;
  activeConversations24h: number;
}

export function reasonBadgeClass(reason: string): string {
  switch (reason) {
    case "acoso":
      return "admin-consultas-reason--acoso";
    case "spam":
      return "admin-consultas-reason--spam";
    case "ofensivo":
      return "admin-consultas-reason--ofensivo";
    case "estafa":
      return "admin-consultas-reason--estafa";
    default:
      return "admin-consultas-reason--otro";
  }
}

export function reportStatusBadgeClass(status: string): string {
  switch (status) {
    case "pendiente":
      return "admin-consultas-status--pendiente";
    case "revisado":
      return "admin-consultas-status--revisado";
    case "descartado":
      return "admin-consultas-status--descartado";
    default:
      return "admin-consultas-status--otro";
  }
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function computeConsultasMetrics(
  reports: MessageReport[],
  conversations: Conversation[],
): ConsultasMetrics {
  const now = Date.now();
  const dayStart = startOfLocalDay(new Date()).getTime();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const pendingReports = reports.filter((r) => r.status === "pendiente").length;

  const resolved = reports.filter((r) => r.status === "revisado" && r.reviewed_at);
  const resolvedToday = resolved.filter(
    (r) => new Date(r.reviewed_at!).getTime() >= dayStart,
  ).length;
  const resolvedThisWeek = resolved.filter(
    (r) => new Date(r.reviewed_at!).getTime() >= weekAgo,
  ).length;

  const responseSamples = resolved
    .map((r) => {
      const created = new Date(r.created_at).getTime();
      const reviewed = new Date(r.reviewed_at!).getTime();
      if (reviewed <= created) return null;
      return (reviewed - created) / (1000 * 60 * 60);
    })
    .filter((h): h is number => h !== null && Number.isFinite(h));

  const avgResponseHours =
    responseSamples.length > 0
      ? responseSamples.reduce((s, h) => s + h, 0) / responseSamples.length
      : null;

  const activeConversations24h = conversations.filter((c) => {
    if (!c.last_message_at) return false;
    return new Date(c.last_message_at).getTime() >= dayAgo;
  }).length;

  return {
    pendingReports,
    resolvedToday,
    resolvedThisWeek,
    avgResponseHours,
    activeConversations24h,
  };
}

export function formatAvgResponseHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

export function matchesReportSearch(report: MessageReport, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    report.reporter_name,
    report.reporter_email,
    report.sender_name,
    report.sender_email,
    report.accommodation_name,
    report.message_body,
    report.reason_label,
    report.detail,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function filterReports(
  reports: MessageReport[],
  opts: {
    search: string;
    reason: ReportReasonFilter;
    status: ReportStatusFilter;
  },
): MessageReport[] {
  return reports
    .filter((r) => matchesReportSearch(r, opts.search))
    .filter((r) => opts.reason === "all" || r.reason === opts.reason)
    .filter((r) => {
      if (opts.status === "all") return true;
      return r.status === opts.status;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function matchesConversationSearch(conv: Conversation, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    conv.guest_name,
    conv.owner_name,
    conv.accommodation_name,
    conv.last_message_preview,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function withinActivityWindow(iso: string | null, filter: ConversationActivityFilter): boolean {
  if (filter === "all") return true;
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const windows: Record<Exclude<ConversationActivityFilter, "all">, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return ts >= now - windows[filter];
}

export function filterConversations(
  conversations: Conversation[],
  opts: {
    search: string;
    activity: ConversationActivityFilter;
  },
): Conversation[] {
  return conversations
    .filter((c) => matchesConversationSearch(c, opts.search))
    .filter((c) => withinActivityWindow(c.last_message_at, opts.activity))
    .sort((a, b) => {
      const ta = a.last_message_at ?? a.created_at;
      const tb = b.last_message_at ?? b.created_at;
      return tb.localeCompare(ta);
    });
}

export function truncateText(text: string, max = 72): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
