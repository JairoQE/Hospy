export type ModerationTab = "todos" | "hospedajes" | "cuentas" | "reportes";

export type ModerationAgeFilter = "all" | "7d" | "30d";

export const REJECT_PRESETS_ACCOMMODATION = [
  { value: "fotos", label: "Fotos insuficientes o de baja calidad" },
  { value: "ubicacion", label: "Ubicación incorrecta o incompleta" },
  { value: "descripcion", label: "Descripción engañosa o incompleta" },
  { value: "datos", label: "Datos del propietario no verificables" },
  { value: "otro", label: "Otro (especificar)" },
] as const;

export const REJECT_PRESETS_ACCOUNT = [
  { value: "documentacion", label: "Documentación o identidad no verificable" },
  { value: "datos", label: "Datos de contacto incorrectos" },
  { value: "politicas", label: "No cumple políticas de la plataforma" },
  { value: "otro", label: "Otro (especificar)" },
] as const;

export function buildRejectMotivo(
  preset: string,
  custom: string,
  presets: readonly { value: string; label: string }[],
): string {
  if (preset === "otro") return custom.trim();
  const hit = presets.find((p) => p.value === preset);
  return hit?.label ?? custom.trim();
}

export function matchesSearchQuery(
  q: string,
  fields: (string | null | undefined)[],
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

export function isWithinAgeFilter(
  createdAt: string | null | undefined,
  filter: ModerationAgeFilter,
): boolean {
  if (filter === "all" || !createdAt) return true;
  const days = filter === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() >= cutoff;
}

export function daysPending(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** El backend devuelve 400 si la cuenta/local ya no está pendiente (doble clic, etc.). */
export function isModerationAlreadyHandledError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("solo se pueden moderar") ||
    msg.includes("estado pendiente") ||
    msg.includes("ya está cancelada")
  );
}
