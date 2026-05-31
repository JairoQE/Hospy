import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "./types";
import { api } from "./client";

export type AdminDashboardBootstrapPayload = {
  reservas: Booking[];
  hospedajes: AccommodationListItem[];
  hospedajes_aprobados_total: number;
  pendientes: AccommodationDetail[];
  propietarios_pendientes: User[];
  reportes_chat_pendientes: number;
  resenas: Review[];
};

const CACHE_KEY = "hospy_admin_dashboard_v1";
const CACHE_TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  savedAt: number;
  data: AdminDashboardBootstrapPayload;
};

function readCache(): AdminDashboardBootstrapPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: AdminDashboardBootstrapPayload) {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), data };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function loadCachedAdminDashboardBootstrap(): AdminDashboardBootstrapPayload | null {
  return readCache();
}

export function clearAdminDashboardBootstrapCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchAdminDashboardBootstrap(): Promise<AdminDashboardBootstrapPayload> {
  const data = await api.get<AdminDashboardBootstrapPayload>(
    "/admin/dashboard-bootstrap/",
  );
  const payload: AdminDashboardBootstrapPayload = {
    reservas: Array.isArray(data.reservas) ? data.reservas : [],
    hospedajes: Array.isArray(data.hospedajes) ? data.hospedajes : [],
    hospedajes_aprobados_total:
      typeof data.hospedajes_aprobados_total === "number"
        ? data.hospedajes_aprobados_total
        : Array.isArray(data.hospedajes)
          ? data.hospedajes.length
          : 0,
    pendientes: Array.isArray(data.pendientes) ? data.pendientes : [],
    propietarios_pendientes: Array.isArray(data.propietarios_pendientes)
      ? data.propietarios_pendientes
      : [],
    reportes_chat_pendientes:
      typeof data.reportes_chat_pendientes === "number"
        ? data.reportes_chat_pendientes
        : 0,
    resenas: Array.isArray(data.resenas) ? data.resenas : [],
  };
  writeCache(payload);
  return payload;
}
