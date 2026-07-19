import type { NearbyExploreItem } from "../api/nearby";

const RESTOPOINT =
  import.meta.env.VITE_RESTOPOINT_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://restaurants-seven-tan.vercel.app";
const ACTIFY =
  import.meta.env.VITE_ACTIFY_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://actify.qd.je";
const CONECTA_TINGO =
  import.meta.env.VITE_CONECTA_TINGO_FRONTEND_URL?.replace(/\/$/, "") ||
  "https://conectatingo.com";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function restopointKey(item: NearbyExploreItem): string {
  const slug = (item.slug || "").trim();
  if (slug) return slug;

  const fromApi = (item.external_url || "").trim();
  const m = fromApi.match(/\/restaurants\/([^/?#]+)/i);
  if (m?.[1] && !UUID_RE.test(decodeURIComponent(m[1]))) {
    return decodeURIComponent(m[1]);
  }

  const id = item.id != null ? String(item.id).trim() : "";
  if (id && !UUID_RE.test(id)) return id;

  return slugifyName(item.name || "");
}

/** URL del detalle en el frontend del proveedor (nunca Hospy). */
export function resolvePartnerDetailUrl(
  item: NearbyExploreItem,
): string | null {
  const source = item.source || "";
  const id = item.id != null ? String(item.id).trim() : "";

  if (source === "restopoint" || item.kind === "restaurant") {
    const fromApi = (item.external_url || "").trim();
    // Prefer API URL only if it already uses slug (not UUID).
    if (fromApi.startsWith("http") && !/\/restaurants\/[0-9a-f-]{36}/i.test(fromApi)) {
      return fromApi;
    }
    const key = restopointKey(item);
    return key
      ? `${RESTOPOINT}/restaurants/${encodeURIComponent(key)}`
      : `${RESTOPOINT}/restaurants`;
  }

  const fromApi = (item.external_url || "").trim();
  if (fromApi.startsWith("http")) return fromApi;

  if (source === "actify" || item.kind === "event") {
    return id ? `${ACTIFY}/events/${encodeURIComponent(id)}` : `${ACTIFY}/events`;
  }
  if (source === "conecta_tingo" || item.kind === "place") {
    const placeId = item.public_id != null ? String(item.public_id) : "";
    return placeId
      ? `${CONECTA_TINGO}/lugares/${encodeURIComponent(placeId)}`
      : `${CONECTA_TINGO}/lugares`;
  }
  return null;
}
