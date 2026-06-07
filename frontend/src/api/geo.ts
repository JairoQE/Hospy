import { api } from "./client";

export type IpGeoSummary = {
  ip?: string;
  country_code?: string;
  country?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  organization?: string;
  is_datacenter?: boolean;
};

export type GeoHints = {
  detected: boolean;
  language: "es-PE" | "en";
  currency: "PEN" | "USD";
  country_code?: string;
  country?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  suggested_department?: string;
  message?: string;
};

export type GeoHintsResponse = {
  geo: IpGeoSummary;
  hints: GeoHints;
};

export type PaymentIpRisk = {
  score: number;
  level: "low" | "medium" | "high";
  flags: string[];
  messages: string[];
  ip_geo?: IpGeoSummary;
};

export type BookingOriginCountry = {
  country_code: string;
  count: number;
  percent: number;
};

export type BookingOriginCity = {
  label: string;
  count: number;
  percent: number;
};

export type OwnerBookingOrigins = {
  days: number;
  total: number;
  by_country: BookingOriginCountry[];
  by_city: BookingOriginCity[];
  international_percent: number;
};

export type ActivityMapPoint = {
  latitude: number;
  longitude: number;
  city: string;
  country_code: string;
  count: number;
  top_actions: { action: string; count: number }[];
};

export type ActivityMapResponse = {
  days: number;
  points: ActivityMapPoint[];
  total_events: number;
};

export type SecurityAlertRow = {
  id: number;
  kind: string;
  severity: string;
  message: string;
  ip_address: string | null;
  user_email: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SecurityAlertsResponse = {
  unresolved_total: number;
  by_kind: Record<string, number>;
  alerts: SecurityAlertRow[];
};

export function fetchGeoHints() {
  return api.get<GeoHintsResponse>("/geo/sugerencias/", false);
}

export function fetchOwnerBookingOrigins(days = 30) {
  return api.get<OwnerBookingOrigins>(
    `/geo/propietario/origen-reservas/?days=${days}`,
  );
}

export function fetchAdminActivityMap(days = 7) {
  return api.get<ActivityMapResponse>(`/geo/admin/mapa-actividad/?days=${days}`);
}

export function fetchAdminSecurityAlerts(limit = 30) {
  return api.get<SecurityAlertsResponse>(
    `/geo/admin/alertas-seguridad/?limit=${limit}`,
  );
}

export function resolveSecurityAlert(id: number) {
  return api.post<{ detail: string; id: number }>(
    `/geo/admin/alertas-seguridad/${id}/resolver/`,
    {},
  );
}
