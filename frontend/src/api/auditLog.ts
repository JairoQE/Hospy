import type { Paginated, UserRole } from "./types";

export type AuditSeverity = "critical" | "high" | "medium" | "low";
export type AuditCategory =
  | "account"
  | "property"
  | "booking"
  | "review"
  | "moderation"
  | "site"
  | "sponsor";

export interface AuditLogEntry {
  id: number;
  created_at: string;
  actor: number | null;
  actor_role: UserRole | "";
  actor_email: string;
  actor_name: string;
  action: string;
  action_label: string;
  severity: AuditSeverity;
  category: string;
  target_type: string;
  target_id: number | null;
  target_label: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent?: string;
  is_archived?: boolean;
}

export type AuditLogListResponse = Paginated<AuditLogEntry>;

export interface AuditSummary {
  total: number;
  last_24h: number;
  last_7d: number;
  critical_events: number;
  admin_actions: number;
  by_role: Record<string, number>;
}

export interface AuditAlertsResponse {
  latest_id: number;
  count: number;
  alerts: AuditLogEntry[];
}

export interface AuditRetentionInfo {
  retention_days: number;
  purge_archived_days: number;
  active_count: number;
  archived_count: number;
  expired_pending_archive: number;
  archived_pending_purge: number;
}

export type AuditLogFilters = {
  role?: UserRole | "";
  action_prefix?: string;
  category?: AuditCategory | "";
  severity?: AuditSeverity | "";
  archived?: boolean;
  q?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

export function buildAuditLogAlertsQuery(afterId: number): string {
  if (afterId <= 0) return "";
  return `?after_id=${afterId}`;
}

export function buildAuditLogQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.action_prefix) params.set("action_prefix", filters.action_prefix);
  if (filters.category) params.set("category", filters.category);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.archived) params.set("archived", "1");
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
