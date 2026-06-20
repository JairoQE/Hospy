import type {
  AccommodationDetail,
  AccommodationOffer,
  PriceBreakdown,
  Review,
  ReviewInsights,
  RoomPublic,
} from "./types";
import { api } from "./client";

export type DetailBootstrapPayload = {
  hospedaje: AccommodationDetail;
  habitaciones: RoomPublic[];
  resenas: Review[];
  ofertas_vigentes?: AccommodationOffer[];
  precios_display?: AccommodationDisplayPrices;
  resenas_insights?: ReviewInsights;
};

export type AccommodationDisplayPrices = {
  precio_desde: number | string | null;
  precio_desde_original: number | string | null;
  oferta_activa: boolean;
  descuento_porcentaje: number | string | null;
};

export type CotizacionPayload = {
  cotizaciones: (PriceBreakdown & { room_id: number })[];
};

const CACHE_PREFIX = "hospy_detalle_bootstrap_v1:";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  savedAt: number;
  data: DetailBootstrapPayload;
};

function readCache(id: string): DetailBootstrapPayload | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${id}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(id: string, data: DetailBootstrapPayload) {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), data };
    sessionStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function loadCachedDetailBootstrap(
  id: string,
): DetailBootstrapPayload | null {
  return readCache(id);
}

export async function fetchDetailBootstrap(
  id: string,
): Promise<DetailBootstrapPayload> {
  const data = await api.get<DetailBootstrapPayload>(
    `/hospedajes/${id}/detalle-bootstrap/`,
    false,
  );
  const payload: DetailBootstrapPayload = {
    hospedaje: data.hospedaje,
    habitaciones: Array.isArray(data.habitaciones) ? data.habitaciones : [],
    resenas: Array.isArray(data.resenas) ? data.resenas : [],
    ofertas_vigentes: Array.isArray(data.ofertas_vigentes) ? data.ofertas_vigentes : [],
    precios_display: data.precios_display ?? undefined,
    resenas_insights: data.resenas_insights ?? undefined,
  };
  writeCache(id, payload);
  return payload;
}

export async function fetchAccommodationCotizacion(
  hospedajeId: string,
  entrada: string,
  salida: string,
): Promise<CotizacionPayload> {
  const qs = new URLSearchParams({ entrada, salida });
  const data = await api.get<CotizacionPayload>(
    `/hospedajes/${hospedajeId}/cotizacion/?${qs}`,
    false,
  );
  return {
    cotizaciones: Array.isArray(data.cotizaciones) ? data.cotizaciones : [],
  };
}
