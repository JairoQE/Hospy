import type {
  AccommodationListItem,
  Booking,
  Review,
  Service,
} from "./types";
import { api } from "./client";

export type OwnerPanelBootstrapPayload = {
  hospedajes: AccommodationListItem[];
  reservas: Booking[];
  resenas: Review[];
  servicios: Service[];
};

const CACHE_PREFIX = "hospy_owner_panel_v1:";
const CACHE_TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  savedAt: number;
  data: OwnerPanelBootstrapPayload;
};

function readCache(): OwnerPanelBootstrapPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: OwnerPanelBootstrapPayload) {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), data };
    sessionStorage.setItem(CACHE_PREFIX, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function loadCachedOwnerPanelBootstrap(): OwnerPanelBootstrapPayload | null {
  return readCache();
}

export function clearOwnerPanelBootstrapCache() {
  try {
    sessionStorage.removeItem(CACHE_PREFIX);
  } catch {
    /* ignore */
  }
}

export async function fetchOwnerPanelBootstrap(): Promise<OwnerPanelBootstrapPayload> {
  const data = await api.get<OwnerPanelBootstrapPayload>(
    "/propietario/panel-bootstrap/",
  );
  const payload: OwnerPanelBootstrapPayload = {
    hospedajes: Array.isArray(data.hospedajes) ? data.hospedajes : [],
    reservas: Array.isArray(data.reservas) ? data.reservas : [],
    resenas: Array.isArray(data.resenas) ? data.resenas : [],
    servicios: Array.isArray(data.servicios) ? data.servicios : [],
  };
  writeCache(payload);
  return payload;
}
