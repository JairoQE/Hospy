export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(n);
}

/** Parsea fechas del API (solo fecha o ISO datetime con zona). */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD — mediodía local para evitar desfase de día
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string | null | undefined): string {
  const d = parseApiDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  const d = parseApiDate(iso);
  if (!d) return "—";
  return d.toLocaleString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    huesped: "Huésped",
    propietario: "Propietario",
    administrador: "Administrador",
  };
  return map[role] ?? role;
}

export function displayName(user: {
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.email;
}

export function typeLabel(type: string): string {
  const map: Record<string, string> = {
    hotel: "Hotel",
    hostal: "Hostal",
    hospedaje: "Hospedaje",
  };
  return map[type] ?? type;
}

export function roomTypeLabel(type: string): string {
  const map: Record<string, string> = {
    simple: "Simple",
    doble: "Doble",
    suite: "Suite",
    familiar: "Familiar",
  };
  return map[type] ?? type;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    cancelada: "Cancelada",
    completada: "Completada",
    rechazada: "Rechazada",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    aprobada: "Publicada",
  };
  return map[status] ?? status;
}

export function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
