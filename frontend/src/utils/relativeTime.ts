import { parseApiDate } from "./format";

/** Tiempo relativo estilo Facebook: "Ahora", "1 h", "3 días". */
export function formatRelativeTime(iso: string): string {
  const date = parseApiDate(iso);
  if (!date) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 60_000) return "Ahora";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 día" : `${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 sem" : `${weeks} sem`;
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

/**
 * Último acceso en español:
 * ahorita (<1 min), hace N minutos (1–59), hace N horas (1–23), hace N días (1+).
 */
export function formatLastAccessRelative(iso: string | null | undefined): string {
  const date = parseApiDate(iso);
  if (!date) return "—";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "ahorita";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return minutes === 1 ? "hace 1 minuto" : `hace ${minutes} minutos`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Recibo de lectura estilo Facebook: "Visto ahora", "Visto hace 5 segundos", etc. */
export function formatSeenRelative(iso: string | null | undefined): string {
  const date = parseApiDate(iso);
  if (!date) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 10_000) return "Visto ahora";
  if (diffMs < 60_000) {
    const secs = Math.floor(diffMs / 1000);
    return secs === 1 ? "Visto hace 1 segundo" : `Visto hace ${secs} segundos`;
  }

  const tail = formatLastAccessRelative(iso);
  return tail === "ahorita" ? "Visto ahorita" : `Visto ${tail}`;
}