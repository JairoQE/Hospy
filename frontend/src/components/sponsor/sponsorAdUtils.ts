import type { SponsorAd, SponsorAdMediaType } from "../../api/types";

export const MAX_ACTIVE_ADS = 5;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 15 * 1024 * 1024;

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.gif";

export function acceptedFileTypes(): string {
  return ACCEPT;
}

export function detectFileMediaType(file: File): SponsorAdMediaType {
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) return "gif";
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

export function validateCreativeFile(file: File): string | null {
  const mt = detectFileMediaType(file);
  if (mt === "video") {
    if (file.size > VIDEO_MAX_BYTES) return "El video no puede superar 15 MB.";
  } else if (file.size > IMAGE_MAX_BYTES) {
    return "La imagen o GIF no puede superar 5 MB.";
  }
  const ok =
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.name.toLowerCase().endsWith(".gif");
  if (!ok) return "Formato no permitido. Usa JPG, PNG, WEBP, GIF, MP4 o WEBM.";
  return null;
}

export function clampDuration(value: number, max = 10): number {
  return Math.min(max, Math.max(1, Math.round(value)));
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function truncateUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 3)}…`;
}

export function adDisplayStatus(ad: SponsorAd): "published" | "paused" | "removed" | "other" {
  if (ad.status === "baja" || ad.status === "rechazado") return "removed";
  if (ad.status === "aprobado" && ad.is_active) return "published";
  if (ad.status === "aprobado" && !ad.is_active) return "paused";
  return "other";
}

/** Estadísticas simuladas hasta contar impresiones en backend. */
export function mockAdStats(adId: number): { impressions: number; ctr: string } {
  const impressions = 800 + (adId * 137) % 4200;
  const ctr = ((1.2 + (adId % 7) * 0.35) / 1).toFixed(1);
  return { impressions, ctr: `${ctr}%` };
}
