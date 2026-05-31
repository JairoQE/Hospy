import type { AuditLogEntry, AuditLogFilters, AuditSummary } from "../api/auditLog";
import type { UserRole } from "../api/types";
import { formatDate } from "./format";
import { exportTableCsv } from "./adminUsersData";

export type AuditSeverity = "critical" | "high" | "medium" | "low";
export type AuditCategory =
  | "all"
  | "account"
  | "property"
  | "booking"
  | "review"
  | "moderation"
  | "site"
  | "sponsor";

export type AuditPeriod = "all" | "24h" | "7d" | "30d";

export const SEVERITY_LABELS: Record<AuditSeverity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  all: "Todas las áreas",
  account: "Cuentas y acceso",
  property: "Hospedajes",
  booking: "Reservas",
  review: "Reseñas",
  moderation: "Moderación",
  site: "Sitio y diseño",
  sponsor: "Patrocinadores",
};

const CATEGORY_ICONS: Record<string, string> = {
  account: "pi-user",
  property: "pi-home",
  booking: "pi-calendar",
  review: "pi-star",
  moderation: "pi-shield",
  site: "pi-palette",
  sponsor: "pi-megaphone",
  other: "pi-circle",
};

export function auditCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
}

export function periodToDateFrom(period: AuditPeriod): string {
  if (period === "all") return "";
  const now = new Date();
  const d = new Date(now);
  if (period === "24h") d.setHours(d.getHours() - 24);
  else if (period === "7d") d.setDate(d.getDate() - 7);
  else if (period === "30d") d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function buildAuditFilters(input: {
  search: string;
  role: UserRole | "all";
  category: AuditCategory;
  severity: AuditSeverity | "all";
  period: AuditPeriod;
  page: number;
  pageSize: number;
  archived?: boolean;
}): AuditLogFilters {
  const filters: AuditLogFilters = {
    page: input.page,
    page_size: input.pageSize,
  };
  if (input.archived) filters.archived = true;
  if (input.search) filters.q = input.search;
  if (input.role !== "all") filters.role = input.role;
  if (input.category !== "all") filters.category = input.category;
  if (input.severity !== "all") filters.severity = input.severity;
  const dateFrom = periodToDateFrom(input.period);
  if (dateFrom) filters.date_from = dateFrom;
  return filters;
}

export type MetadataLine = { label: string; value: string };

export function formatAuditMetadata(entry: AuditLogEntry): MetadataLine[] {
  const m = entry.metadata ?? {};
  const lines: MetadataLine[] = [];

  if (Array.isArray(m.fields) && m.fields.length) {
    lines.push({ label: "Campos modificados", value: (m.fields as string[]).join(", ") });
  }
  if (m.from && m.to) {
    lines.push({ label: "Cambio", value: `${String(m.from)} → ${String(m.to)}` });
  }
  if (m.motivo) lines.push({ label: "Motivo", value: String(m.motivo) });
  if (m.accion) lines.push({ label: "Resolución", value: String(m.accion) });
  if (m.status) lines.push({ label: "Estado", value: String(m.status) });
  if (m.admin_notes) lines.push({ label: "Notas del administrador", value: String(m.admin_notes) });
  if (m.warning) lines.push({ label: "Advertencia enviada", value: String(m.warning) });
  if (m.check_in && m.check_out) {
    lines.push({ label: "Estadía", value: `${String(m.check_in)} → ${String(m.check_out)}` });
  }
  if (m.total_amount) lines.push({ label: "Importe", value: String(m.total_amount) });
  if (m.rating) lines.push({ label: "Calificación", value: String(m.rating) });

  const known = new Set([
    "fields", "from", "to", "motivo", "accion", "status", "admin_notes",
    "warning", "check_in", "check_out", "total_amount", "rating",
  ]);
  for (const [key, val] of Object.entries(m)) {
    if (known.has(key) || val === null || val === undefined || val === "") continue;
    lines.push({ label: key, value: typeof val === "string" ? val : JSON.stringify(val) });
  }
  return lines;
}

export function metadataPreview(entry: AuditLogEntry): string {
  const lines = formatAuditMetadata(entry);
  if (lines.length === 0) return "—";
  return lines.map((l) => `${l.label}: ${l.value}`).join(" · ");
}

export function exportAuditCsv(rows: AuditLogEntry[]) {
  exportTableCsv(
    `hospy-auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "ID",
      "Fecha",
      "Severidad",
      "Usuario",
      "Correo",
      "Rol",
      "Acción",
      "Elemento",
      "Tipo",
      "ID objeto",
      "Detalle",
      "IP",
    ],
    rows.map((e) => [
      String(e.id),
      formatDate(e.created_at),
      e.severity ?? "",
      e.actor_name,
      e.actor_email,
      e.actor_role,
      e.action_label,
      e.target_label,
      e.target_type,
      e.target_id ? String(e.target_id) : "",
      metadataPreview(e),
      e.ip_address ?? "",
    ]),
  );
}

export type { AuditSummary };
