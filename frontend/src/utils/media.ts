/**
 * Convierte URLs de medios del API a rutas que el proxy de Vite puede servir.
 * Django puede devolver "media/..." sin barra, o URLs absolutas a :8000.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/media/")) {
        return parsed.pathname + parsed.search;
      }
      if (parsed.pathname.includes("/media/")) {
        const idx = parsed.pathname.indexOf("/media/");
        return parsed.pathname.slice(idx) + parsed.search;
      }
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
