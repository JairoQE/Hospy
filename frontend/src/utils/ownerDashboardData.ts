import type { AccommodationListItem, Booking, Review } from "../api/types";
import { parseApiDate } from "./format";

export type DashboardPeriod = "7d" | "30d" | "month" | "quarter" | "year";

export type TrendDir = "up" | "down" | "flat";

export type KpiMetric = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  trend: TrendDir;
  trendLabel: string;
  icon: string;
};

export type DailyPoint = {
  date: string;
  label: string;
  occupancy: number;
  revenue: number;
};

export type BookingStatusSlice = {
  status: string;
  name: string;
  count: number;
  percent: number;
  color: string;
};

export type DashboardAlert = {
  id: string;
  tone: "info" | "warn";
  message: string;
  icon: string;
};

export type DashboardData = {
  kpis: KpiMetric[];
  dailySeries: DailyPoint[];
  bookingStatuses: BookingStatusSlice[];
  upcomingBookings: Booking[];
  recentReviews: Review[];
  alerts: DashboardAlert[];
  hasEnoughData: boolean;
  propertyLabel: string;
};

const BOOKING_STATUS_META = [
  { status: "pendiente", name: "Pendiente", color: "#F59E0B" },
  { status: "confirmada", name: "Confirmada", color: "#2563EB" },
  { status: "completada", name: "Completada", color: "#10B981" },
  { status: "cancelada", name: "Cancelada", color: "#6B7280" },
] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function periodRange(period: DashboardPeriod, ref = new Date()): {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const end = startOfDay(ref);
  let start: Date;
  let days: number;

  switch (period) {
    case "7d":
      days = 7;
      start = addDays(end, -6);
      break;
    case "30d":
      days = 30;
      start = addDays(end, -29);
      break;
    case "month":
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      break;
    case "quarter": {
      const q = Math.floor(end.getMonth() / 3);
      start = new Date(end.getFullYear(), q * 3, 1);
      days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      break;
    }
    case "year":
      start = new Date(end.getFullYear(), 0, 1);
      days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      break;
    default:
      days = 30;
      start = addDays(end, -29);
  }

  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  return { start, end, prevStart, prevEnd };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseApiDate(checkIn);
  const b = parseApiDate(checkOut);
  if (!a || !b) return 1;
  const diff = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
  return diff;
}

function bookingAmount(b: Booking): number {
  const n = typeof b.total_amount === "string" ? parseFloat(b.total_amount) : b.total_amount;
  return Number.isFinite(n) ? n : 0;
}

function overlapsRange(
  checkIn: string,
  checkOut: string,
  start: Date,
  end: Date,
): boolean {
  const inD = parseApiDate(checkIn);
  const outD = parseApiDate(checkOut);
  if (!inD) return false;
  const out = outD ?? inD;
  return inD <= end && out >= start;
}

function filterBookingsByProperty(
  bookings: Booking[],
  propertyName: string | null,
): Booking[] {
  if (!propertyName) return bookings;
  return bookings.filter((b) => b.hospedaje === propertyName);
}

function isDateWithin(d: Date, start: Date, end: Date): boolean {
  return d >= startOfDay(start) && d <= endOfDay(end);
}

function createdWithin(b: Booking, start: Date, end: Date): boolean {
  const d = parseApiDate(b.created_at);
  if (!d) return false;
  return isDateWithin(d, start, end);
}

function confirmedStatuses(status: string): boolean {
  return status === "confirmada" || status === "completada";
}

function periodStats(
  bookings: Booking[],
  properties: AccommodationListItem[],
  start: Date,
  end: Date,
) {
  // En panel de propietario, "ingresos" suele entenderse como reservas creadas/confirmadas en el período
  // (aunque el check-in sea futuro). Ocupación sigue basado en fechas de estadía.
  const inCreatedRange = bookings.filter((b) => createdWithin(b, start, end));
  const confirmed = inCreatedRange.filter((b) => confirmedStatuses(b.status));
  const cancelled = inCreatedRange.filter(
    (b) => b.status === "cancelada" || b.status === "rechazada",
  );
  const revenue = confirmed.reduce((s, b) => s + bookingAmount(b), 0);

  const inStayRange = bookings.filter((b) => overlapsRange(b.check_in, b.check_out, start, end));
  const stayConfirmed = inStayRange.filter((b) => confirmedStatuses(b.status));
  const nights = stayConfirmed.reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0);
  const periodDays =
    Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
  const capacity = Math.max(1, properties.length) * periodDays;
  const occupancy = Math.min(100, Math.round((nights / capacity) * 100));
  const cancelRate =
    inCreatedRange.length > 0
      ? Math.round((cancelled.length / inCreatedRange.length) * 100)
      : 0;

  return {
    confirmedCount: confirmed.length,
    revenue,
    occupancy,
    cancelRate,
    inRangeCount: inCreatedRange.length,
  };
}

function trend(current: number, previous: number): { dir: TrendDir; label: string } {
  if (previous === 0 && current === 0) return { dir: "flat", label: "Sin cambio" };
  if (previous === 0) return { dir: "up", label: `↑ ${current > 0 ? "100" : "0"}%` };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { dir: "flat", label: "Sin cambio" };
  if (pct > 0) return { dir: "up", label: `↑ ${pct}%` };
  return { dir: "down", label: `↓ ${Math.abs(pct)}%` };
}

function formatPen(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Reservas del período agrupadas por estado real (todas vía Hospy). */
function buildBookingStatusBreakdown(bookings: Booking[]): BookingStatusSlice[] {
  if (bookings.length === 0) return [];

  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
  }

  const total = bookings.length;
  const known: BookingStatusSlice[] = BOOKING_STATUS_META.map((meta) => ({
    status: meta.status,
    name: meta.name,
    color: meta.color,
    count: counts.get(meta.status) ?? 0,
    percent: Math.round(((counts.get(meta.status) ?? 0) / total) * 100),
  })).filter((s) => s.count > 0);

  const knownTotal = known.reduce((s, x) => s + x.count, 0);
  const otherCount = total - knownTotal;
  if (otherCount > 0) {
    known.push({
      status: "otro",
      name: "Otro estado",
      color: "#9CA3AF",
      count: otherCount,
      percent: Math.round((otherCount / total) * 100),
    });
  }

  return known;
}

function buildDailySeries(
  bookings: Booking[],
  properties: AccommodationListItem[],
  start: Date,
  end: Date,
): DailyPoint[] {
  const points: DailyPoint[] = [];
  const propCount = Math.max(1, properties.length);

  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
    const dayBookings = bookings.filter((b) => {
      if (!confirmedStatuses(b.status)) return false;
      return createdWithin(b, d, d);
    });
    const revenue = dayBookings.reduce((s, b) => s + bookingAmount(b), 0);
    const nights = dayBookings.reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0);
    const occupancy = Math.min(100, Math.round((nights / propCount) * 100));
    const label = d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
    points.push({
      date: d.toISOString().slice(0, 10),
      label,
      occupancy,
      revenue,
    });
  }
  return points;
}

function buildAlerts(
  bookings: Booking[],
  properties: AccommodationListItem[],
  unreadMessages: number,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const today = startOfDay(new Date());

  if (unreadMessages > 0) {
    alerts.push({
      id: "messages",
      tone: "info",
      icon: "pi-comments",
      message: `Tienes ${unreadMessages} mensaje${unreadMessages === 1 ? "" : "s"} sin responder en Consultas`,
    });
  }

  const noPhoto = properties.filter((p) => !p.foto_principal);
  if (noPhoto.length > 0) {
    alerts.push({
      id: "photos",
      tone: "warn",
      icon: "pi-camera",
      message: `Falta agregar fotos a «${noPhoto[0].name}»`,
    });
  }

  const upcoming = bookings
    .filter((b) => confirmedStatuses(b.status))
    .map((b) => ({ b, in: parseApiDate(b.check_in) }))
    .filter((x) => x.in && x.in >= today)
    .sort((a, c) => (a.in!.getTime() > c.in!.getTime() ? 1 : -1))[0];

  if (upcoming) {
    const fecha = upcoming.in!.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
    });
    alerts.push({
      id: "checkin",
      tone: "info",
      icon: "pi-calendar",
      message: `Próximo check-in: ${upcoming.b.huesped.nombre} el ${fecha} (${upcoming.b.hospedaje})`,
    });
  }

  return alerts;
}

export function buildDashboardData(params: {
  period: DashboardPeriod;
  propertyId: number | "all";
  properties: AccommodationListItem[];
  bookings: Booking[];
  reviews: Review[];
  unreadMessages: number;
}): DashboardData {
  const { period, propertyId, properties, bookings, reviews, unreadMessages } = params;
  const property =
    propertyId === "all"
      ? null
      : properties.find((p) => p.id === propertyId) ?? null;
  const propertyName = property?.name ?? null;
  const scopedProps = property ? [property] : properties;

  const { start, end, prevStart, prevEnd } = periodRange(period);
  const propertyBookings = filterBookingsByProperty(bookings, propertyName);

  const cur = periodStats(propertyBookings, scopedProps, start, end);
  const prev = periodStats(propertyBookings, scopedProps, prevStart, prevEnd);

  const avgRating =
    scopedProps.length > 0
      ? scopedProps.reduce((s, p) => {
          const r =
            typeof p.average_rating === "string"
              ? parseFloat(p.average_rating)
              : p.average_rating;
          return s + (Number.isFinite(r) ? r : 0);
        }, 0) / scopedProps.length
      : 0;

  const occTrend = trend(cur.occupancy, prev.occupancy);
  const revTrend = trend(cur.revenue, prev.revenue);
  const resTrend = trend(cur.confirmedCount, prev.confirmedCount);
  const cancelTrendLabel =
    cur.cancelRate < prev.cancelRate
      ? `↓ ${Math.abs(prev.cancelRate - cur.cancelRate)} pp`
      : cur.cancelRate > prev.cancelRate
        ? `↑ ${cur.cancelRate - prev.cancelRate} pp`
        : "Sin cambio";

  const cancelTrendDir: TrendDir =
    cur.cancelRate < prev.cancelRate ? "up" : cur.cancelRate > prev.cancelRate ? "down" : "flat";

  const kpis: KpiMetric[] = [
    {
      id: "occupancy",
      label: "Tasa de ocupación",
      value: `${cur.occupancy}%`,
      sublabel: "Noches reservadas / capacidad",
      trend: occTrend.dir,
      trendLabel: occTrend.label.replace("↑", "↑ ").replace("↓", "↓ "),
      icon: "pi-home",
    },
    {
      id: "revenue",
      label: "Ingresos totales",
      value: formatPen(cur.revenue),
      sublabel: "Reservas confirmadas",
      trend: revTrend.dir,
      trendLabel: revTrend.label,
      icon: "pi-wallet",
    },
    {
      id: "bookings",
      label: "Reservas confirmadas",
      value: String(cur.confirmedCount),
      sublabel: "En el período",
      trend: resTrend.dir,
      trendLabel: resTrend.label,
      icon: "pi-calendar",
    },
    {
      id: "rating",
      label: "Calificación promedio",
      value: avgRating > 0 ? avgRating.toFixed(1) : "—",
      sublabel: "Tus hospedajes",
      trend: "flat",
      trendLabel: avgRating > 0 ? "★ reseñas" : "Sin datos",
      icon: "pi-star-fill",
    },
    {
      id: "cancel",
      label: "Tasa de cancelación",
      value: `${cur.cancelRate}%`,
      sublabel: "Del total del período",
      trend: cancelTrendDir,
      trendLabel: cancelTrendLabel,
      icon: "pi-times-circle",
    },
  ];

  const today = startOfDay(new Date());
  const upcomingBookings = bookings
    .filter(
      (b) =>
        confirmedStatuses(b.status) &&
        (!propertyName || b.hospedaje === propertyName),
    )
    .map((b) => ({ b, in: parseApiDate(b.check_in) }))
    .filter((x) => x.in && x.in >= today)
    .sort((a, c) => a.in!.getTime() - c.in!.getTime())
    .slice(0, 5)
    .map((x) => x.b);

  const propertyIds = new Set(scopedProps.map((p) => p.id));
  const recentReviews = reviews
    .filter((r) => propertyIds.has(r.accommodation))
    .sort((a, b) => {
      const da = parseApiDate(a.created_at)?.getTime() ?? 0;
      const db = parseApiDate(b.created_at)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 3);

  const hasEnoughData = cur.inRangeCount >= 2 || cur.confirmedCount >= 1;

  return {
    kpis,
    dailySeries: buildDailySeries(
      propertyBookings,
      scopedProps,
      start,
      end,
    ),
    bookingStatuses: buildBookingStatusBreakdown(
      propertyBookings.filter((b) => createdWithin(b, start, end)),
    ),
    upcomingBookings,
    recentReviews,
    alerts: buildAlerts(bookings, properties, unreadMessages),
    hasEnoughData,
    propertyLabel: property?.name ?? "Todos los hospedajes",
  };
}
