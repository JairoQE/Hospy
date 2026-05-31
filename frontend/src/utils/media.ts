/**
 * Normaliza URLs de medios del API para el frontend.
 * - Rutas /media/... → proxy de Vite en desarrollo
 * - URLs absolutas de CDN (Cloudinary, etc.) → se devuelven tal cual
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        if (parsed.pathname.startsWith("/media/")) {
          return parsed.pathname + parsed.search;
        }
        if (parsed.pathname.includes("/media/")) {
          const idx = parsed.pathname.indexOf("/media/");
          return parsed.pathname.slice(idx) + parsed.search;
        }
      }
      return trimmed;
    }
  } catch {
    /* relative */
  }

  if (trimmed.startsWith("/media/")) return trimmed;

  if (trimmed.startsWith("media/")) return `/${trimmed}`;

  if (!trimmed.startsWith("/") && !trimmed.includes("://")) {
    return `/media/${trimmed.replace(/^\/+/, "")}`;
  }

  return trimmed;
}
