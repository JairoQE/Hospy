import type { UserRole } from "../api/types";
import type { Currency, Language } from "../i18n/translations";
import { translate } from "../i18n/translations";
import { getLocaleCurrencyConfig } from "./localeCurrencyConfig";

export type FormatOptions = {
  language?: Language;
  currency?: Currency;
  /** PEN por 1 USD (precios en BD están en soles). */
  penPerUsd?: number;
};

function resolveFormatOpts(opts?: FormatOptions) {
  const cfg = getLocaleCurrencyConfig();
  return {
    language: opts?.language ?? cfg.language,
    currency: opts?.currency ?? cfg.currency,
    penPerUsd: opts?.penPerUsd ?? cfg.penPerUsd,
  };
}

function intlLocale(language: Language): string {
  return language === "en" ? "en-US" : "es-PE";
}

/** Convierte monto almacenado en PEN a la moneda de visualización. */
export function convertFromPen(
  amountPen: number,
  currency: Currency,
  penPerUsd: number,
): number {
  if (currency === "USD" && penPerUsd > 0) {
    return amountPen / penPerUsd;
  }
  return amountPen;
}

export function formatMoney(
  value: string | number | null | undefined,
  opts?: FormatOptions,
): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  const { language, currency, penPerUsd } = resolveFormatOpts(opts);
  const display = convertFromPen(n, currency, penPerUsd);
  return new Intl.NumberFormat(intlLocale(language), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PEN" ? 0 : 2,
  }).format(display);
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

export function formatDate(
  iso: string | null | undefined,
  opts?: Pick<FormatOptions, "language">,
): string {
  const d = parseApiDate(iso);
  if (!d) return "—";
  const { language } = resolveFormatOpts(opts);
  return d.toLocaleDateString(intlLocale(language), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Rango corto para tarjetas: «28 ago. – 5 set.» */
export function formatStayDateRange(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  opts?: Pick<FormatOptions, "language">,
): string | null {
  const start = parseApiDate(checkIn);
  const end = parseApiDate(checkOut);
  if (!start || !end) return null;
  const { language } = resolveFormatOpts(opts);
  const locale = intlLocale(language);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(/\.$/, "");
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatDateTime(
  iso: string | null | undefined,
  opts?: Pick<FormatOptions, "language">,
): string {
  const d = parseApiDate(iso);
  if (!d) return "—";
  const { language } = resolveFormatOpts(opts);
  return d.toLocaleString(intlLocale(language), {
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
    patrocinador: "Patrocinador",
    administrador: "Administrador",
  };
  return map[role] ?? role;
}

/** Clave i18n del título de cabecera según rol (p. ej. perfil de propietario de {name}). */
export function roleProfileTitleI18nKey(role: UserRole | string): string {
  const keys: Record<string, string> = {
    propietario: "ownerStorePage.titlePropietario",
    patrocinador: "ownerStorePage.titlePatrocinador",
    administrador: "ownerStorePage.titleAdministrador",
    huesped: "ownerStorePage.titleHuesped",
  };
  return keys[role] ?? keys.huesped;
}

/** Clave i18n de la etiqueta breve del perfil público según rol. */
export function roleProfileLabelI18nKey(role: UserRole | string): string {
  const keys: Record<string, string> = {
    propietario: "ownerStore.labelPropietario",
    patrocinador: "ownerStore.labelPatrocinador",
    administrador: "ownerStore.labelAdministrador",
    huesped: "ownerStore.labelHuesped",
  };
  return keys[role] ?? keys.huesped;
}

/** Clave i18n del enlace «ver perfil» según rol. */
export function roleProfileVisitI18nKey(role: UserRole | string): string {
  const keys: Record<string, string> = {
    propietario: "ownerStore.visitPropietario",
    patrocinador: "ownerStore.visitPatrocinador",
    administrador: "ownerStore.visitAdministrador",
    huesped: "ownerStore.visitHuesped",
  };
  return keys[role] ?? keys.huesped;
}

export function displayName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  email: string;
}): string {
  const parts = [user.first_name, user.last_name]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0 && !p.includes("@"));
  const full = parts.join(" ").trim();
  if (full) return full;
  const uname = (user.username ?? "").trim();
  if (uname) return uname;
  const local = user.email.split("@")[0]?.trim();
  return local || user.email;
}

/** Título del perfil y si conviene mostrar el correo debajo (evita duplicar email como nombre). */
export function profileHeading(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  email: string;
}): { title: string; showEmail: boolean } {
  const title = displayName(user);
  const email = user.email.trim().toLowerCase();
  const titleLower = title.trim().toLowerCase();
  const showEmail =
    titleLower !== email && !titleLower.includes("@") && !email.startsWith(titleLower);
  return { title, showEmail };
}

export function typeLabel(type: string, opts?: Pick<FormatOptions, "language">): string {
  const { language } = resolveFormatOpts(opts);
  const key = `type.${type}`;
  const translated = translate(key, language);
  if (translated !== key) return translated;
  const fallback: Record<string, string> = {
    hotel: "Hotel",
    hostal: "Hostal",
    hospedaje: "Hospedaje",
    casa_departamento: "Casa o departamento",
  };
  return fallback[type] ?? type;
}

export function roomTypeLabel(type: string, opts?: Pick<FormatOptions, "language">): string {
  const { language } = resolveFormatOpts(opts);
  const key = `detail.roomType.${type}`;
  const translated = translate(key, language);
  if (translated !== key) return translated;
  return type;
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
