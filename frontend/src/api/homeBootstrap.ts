import type { BrowseTile, FeaturedSearchesPayload } from "./types";
import type { UbigeoItem } from "../components/home/LocationExplorer";
import { api } from "./client";

export type HomeBootstrapPayload = {
  tipo: BrowseTile[];
  region: BrowseTile[];
  departamento: BrowseTile[];
  ubigeo_departamentos: UbigeoItem[];
  busquedas_destacadas: FeaturedSearchesPayload;
};

const CACHE_KEY = "hospy_home_bootstrap_v2";
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  savedAt: number;
  data: HomeBootstrapPayload;
};

function readCache(): HomeBootstrapPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: HomeBootstrapPayload) {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function loadCachedHomeBootstrap(): HomeBootstrapPayload | null {
  return readCache();
}

export async function fetchHomeBootstrap(): Promise<HomeBootstrapPayload> {
  const data = await api.get<HomeBootstrapPayload>("/inicio-bootstrap/", false);
  const featured = data.busquedas_destacadas;
  const payload: HomeBootstrapPayload = {
    tipo: Array.isArray(data.tipo) ? data.tipo : [],
    region: Array.isArray(data.region) ? data.region : [],
    departamento: Array.isArray(data.departamento) ? data.departamento : [],
    ubigeo_departamentos: Array.isArray(data.ubigeo_departamentos)
      ? data.ubigeo_departamentos
      : [],
    busquedas_destacadas: {
      ciudades: Array.isArray(featured?.ciudades) ? featured.ciudades : [],
      destinos: Array.isArray(featured?.destinos) ? featured.destinos : [],
    },
  };
  writeCache(payload);
  return payload;
}

/** Despierta el backend en Render free (sin bloquear la UI). */
export function warmupApi(): void {
  const base = import.meta.env.VITE_API_URL ?? "/api/v1";
  const root = base.replace(/\/api\/v1\/?$/, "");
  void fetch(`${root}/health/`, { mode: "cors", credentials: "omit" }).catch(() => {});
}
