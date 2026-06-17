import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "../api/types";
import { parseApiDate } from "./format";

export type AdminPeriod = "7d" | "30d" | "month" | "quarter" | "year";
export type AdminPropertyFilter = "all" | "active" | "pending" | "suspended";
export type TrendDir = "up" | "down" | "flat";

export type AdminKpi = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  tooltip: string;
  trend: TrendDir;
  trendLabel: string;
  icon: string;
};

export type AdminDailyPoint = {
  label: string;
  date: string;
  revenue: number;
  bookings: number;
  confirmedRevenue: number;
  cancelledRevenue: number;
};

export type AdminTypeSlice = {
  name: string;
  count: number;
  revenue: number;
  percent: number;
  color: string;
};

export type AdminResolvedRange = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  days: number;
  label: string;
};

export type AdminRegionBar = {
  city: string;
  bookings: number;
  revenue: number;
};

export type AdminTopProperty = {
  id: number;
  name: string;
  city: string;
  occupancy: number;
  revenue: number;
  reviewCount: number;
};

export type AdminAlert = {
  id: string;
  priority: "high" | "medium" | "low";
  message: string;
  icon: string;
};

export type AdminDashboardSnapshot = {
  kpis: AdminKpi[];
  dailySeries: AdminDailyPoint[];
  typeDistribution: AdminTypeSlice[];
  regionBars: AdminRegionBar[];
  topProperties: AdminTopProperty[];
  recentBookings: Booking[];
  alerts: AdminAlert[];
  hasEnoughData: boolean;
};

const TYPE_COLORS: Record<string, string> = {
  hotel: "#2563EB",
  hostal: "#8B5CF6",
  hospedaje: "#F59E0B",
  casa_departamento: "#10B981",
  otro: "#6B7280",
};

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  hostal: "Hostal",
  hospedaje: "Hospedaje",
  casa_departamento: "Casa o departamento",
  otro: "Otros",
};

export const ADMIN_PERIOD_LABELS: Record<AdminPeriod, string> = {
  "7d": "7 días",
  "30d": "30 días",
  month: "Este mes",
  quarter: "Trimestre",
  year: "Año",
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function adminPeriodRange(period: AdminPeriod, ref = new Date()) {
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
  return { start, end, prevStart, prevEnd, days };
}

export function resolveAdminRange(
  period: AdminPeriod,
  customRange?: { from: string; to: string } | null,
  ref = new Date(),
): AdminResolvedRange {
  const fromRaw = customRange?.from?.trim();
  const toRaw = customRange?.to?.trim();
  if (fromRaw && toRaw) {
    let start = parseApiDate(fromRaw);
    let end = parseApiDate(toRaw);
    if (!start || !end) {
      const fallback = adminPeriodRange(period, ref);
      return { ...fallback, label: ADMIN_PERIOD_LABELS[period] };
    }
    start = startOfDay(start);
    end = startOfDay(end);
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    const label = `${start.toLocaleDateString("es-PE")} – ${end.toLocaleDateString("es-PE")}`;
    return { start, end, prevStart, prevEnd, days, label };
  }
  const base = adminPeriodRange(period, ref);
  return { ...base, label: ADMIN_PERIOD_LABELS[period] };
}

function bookingAmount(b: Booking): number {
  const n = typeof b.total_amount === "string" ? parseFloat(b.total_amount) : b.total_amount;
  return Number.isFinite(n) ? n : 0;
}

function overlapsRange(checkIn: string, checkOut: string, start: Date, end: Date): boolean {
  const inD = parseApiDate(checkIn);
  const outD = parseApiDate(checkOut);
  if (!inD) return false;
  const out = outD ?? inD;
  return inD <= end && out >= start;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseApiDate(checkIn);
  const b = parseApiDate(checkOut);
  if (!a || !b) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function trend(cur: number, prev: number): { dir: TrendDir; label: string } {
  if (prev === 0 && cur === 0) return { dir: "flat", label: "Sin cambio" };
  if (prev === 0) return { dir: "up", label: "↑ 100%" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { dir: "flat", label: "Sin cambio" };
  return pct > 0
    ? { dir: "up", label: `↑ ${pct}%` }
    : { dir: "down", label: `↓ ${Math.abs(pct)}%` };
}

function formatPen(n: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n);
}

function confirmedStatus(s: string): boolean {
  return s === "confirmada" || s === "completada";
}

function cancelledStatus(s: string): boolean {
  return s === "cancelada";
}

function activeStatus(s: string): boolean {
  return s === "confirmada" || s === "completada" || s === "pendiente";
}

export function buildAdminDashboard(params: {
  period: AdminPeriod;
  customRange?: { from: string; to: string } | null;
  region: string;
  propertyFilter: AdminPropertyFilter;
  bookings: Booking[];
  accommodations: AccommodationListItem[];
  pendingAccommodations: AccommodationDetail[];
  pendingOwners: User[];
  pendingReports: number;
  reviews: Review[];
  approvedCount: number;
}): AdminDashboardSnapshot {
  const {
    period,
    customRange,
    region,
    propertyFilter,
    bookings,
    accommodations,
    pendingAccommodations,
    pendingOwners,
    pendingReports,
    reviews,
    approvedCount,
  } = params;

  const { start, end, prevStart, prevEnd, days } = resolveAdminRange(period, customRange);

  const createdInRange = (b: Booking, s: Date, e: Date) => {
    const created = parseApiDate(b.created_at);
    if (!created) return false;
    const d = startOfDay(created);
    return d >= s && d <= e;
  };

  const accByName = new Map<string, AccommodationListItem>();
  for (const a of accommodations) accByName.set(a.name, a);
  for (const p of pendingAccommodations) {
    accByName.set(p.name, {
      id: p.id,
      name: p.name,
      type: p.type,
      city: p.city,
      average_rating: p.average_rating,
      precio_desde: null,
      foto_principal: null,
      status: p.status,
      is_active: p.is_active,
    });
  }

  const regionMatch = (city: string) =>
    region === "all" || city.toLowerCase().includes(region.toLowerCase());

  const filterBooking = (b: Booking) => {
    if (!regionMatch(b.ciudad)) return false;
    const acc = accByName.get(b.hospedaje);
    if (propertyFilter === "active" && acc && acc.status !== "aprobado") return false;
    if (propertyFilter === "pending" && acc && acc.status !== "pendiente") return false;
    if (propertyFilter === "suspended" && acc && acc.is_active !== false) return false;
    return true;
  };

  // Ingresos y conteos por período: fecha de creación de la reserva (como panel propietario).
  const inPeriod = (b: Booking, s: Date, e: Date) =>
    filterBooking(b) && createdInRange(b, s, e);

  // Ocupación: noches que caen dentro del período según check-in / check-out.
  const inStayPeriod = (b: Booking, s: Date, e: Date) =>
    filterBooking(b) && overlapsRange(b.check_in, b.check_out, s, e);

  const curBookings = bookings.filter((b) => inPeriod(b, start, end));
  const prevBookings = bookings.filter((b) => inPeriod(b, prevStart, prevEnd));

  const curStayBookings = bookings.filter((b) => inStayPeriod(b, start, end));
  const prevStayBookings = bookings.filter((b) => inStayPeriod(b, prevStart, prevEnd));

  const curConfirmed = curBookings.filter((b) => confirmedStatus(b.status));
  const prevConfirmed = prevBookings.filter((b) => confirmedStatus(b.status));

  const curRevenue = curConfirmed.reduce((s, b) => s + bookingAmount(b), 0);
  const prevRevenue = prevConfirmed.reduce((s, b) => s + bookingAmount(b), 0);

  const curCancelled = curBookings.filter((b) => cancelledStatus(b.status));
  const prevCancelled = prevBookings.filter((b) => cancelledStatus(b.status));
  const curCancelledRevenue = curCancelled.reduce((s, b) => s + bookingAmount(b), 0);
  const prevCancelledRevenue = prevCancelled.reduce((s, b) => s + bookingAmount(b), 0);

  const curActive = curBookings.filter((b) => activeStatus(b.status)).length;
  const prevActive = prevBookings.filter((b) => activeStatus(b.status)).length;

  const moderationQueue =
    pendingAccommodations.length + pendingOwners.length + pendingReports;

  const propCount = Math.max(1, approvedCount + pendingAccommodations.length);
  const nights = curStayBookings
    .filter((b) => confirmedStatus(b.status))
    .reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0);
  const capacity = propCount * days;
  const occupancy = Math.min(100, Math.round((nights / capacity) * 100));
  const prevNights = prevStayBookings
    .filter((b) => confirmedStatus(b.status))
    .reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0);
  const prevOccupancy = Math.min(100, Math.round((prevNights / capacity) * 100));

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : accommodations.length > 0
        ? accommodations.reduce((s, a) => {
            const r =
              typeof a.average_rating === "string"
                ? parseFloat(a.average_rating)
                : a.average_rating;
            return s + (Number.isFinite(r) ? r : 0);
          }, 0) / accommodations.length
        : 0;

  const kpis: AdminKpi[] = [
    {
      id: "revenue",
      label: "Ingresos totales",
      value: formatPen(curRevenue),
      sublabel: "Reservas confirmadas",
      tooltip: "Suma de montos de reservas confirmadas o completadas creadas en el período",
      trend: trend(curRevenue, prevRevenue).dir,
      trendLabel: trend(curRevenue, prevRevenue).label,
      icon: "pi-wallet",
    },
    {
      id: "occupancy",
      label: "Ocupación global",
      value: `${occupancy}%`,
      sublabel: "Promedio estimado",
      tooltip: "Noches reservadas frente a capacidad de hospedajes activos",
      trend: trend(occupancy, prevOccupancy).dir,
      trendLabel: trend(occupancy, prevOccupancy).label,
      icon: "pi-home",
    },
    {
      id: "bookings",
      label: "Reservas activas",
      value: String(curActive),
      sublabel: "Confirmadas y pendientes",
      tooltip: "Reservas con estado pendiente o confirmada creadas en el período",
      trend: trend(curActive, prevActive).dir,
      trendLabel: trend(curActive, prevActive).label,
      icon: "pi-calendar",
    },
    {
      id: "cancellations",
      label: "Cancelaciones",
      value: String(curCancelled.length),
      sublabel: formatPen(curCancelledRevenue),
      tooltip: "Reservas canceladas y monto asociado en el período",
      trend: (() => {
        const t = trend(curCancelled.length, prevCancelled.length);
        if (t.dir === "up") return "down" as TrendDir;
        if (t.dir === "down") return "up" as TrendDir;
        return "flat" as TrendDir;
      })(),
      trendLabel: trend(curCancelledRevenue, prevCancelledRevenue).label,
      icon: "pi-times-circle",
    },
    {
      id: "moderation",
      label: "Cola de moderación",
      value: String(moderationQueue),
      sublabel: "Pendientes de revisión",
      tooltip: "Hospedajes, propietarios y reportes de chat sin atender",
      trend: moderationQueue > 0 ? "down" : "flat",
      trendLabel: moderationQueue > 0 ? "Requiere acción" : "Al día",
      icon: "pi-shield",
    },
    {
      id: "properties",
      label: "Propiedades activas",
      value: String(approvedCount),
      sublabel: `${pendingAccommodations.length} pendientes`,
      tooltip: "Hospedajes aprobados publicados en la plataforma",
      trend: "flat",
      trendLabel: `${pendingAccommodations.length} en cola`,
      icon: "pi-building",
    },
    {
      id: "rating",
      label: "Calificación promedio",
      value: avgRating > 0 ? avgRating.toFixed(1) : "—",
      sublabel: "Reseñas publicadas",
      tooltip: "Promedio de calificaciones en reseñas aprobadas",
      trend: "flat",
      trendLabel: avgRating > 0 ? "★ global" : "Sin datos",
      icon: "pi-star-fill",
    },
  ];

  const dailySeries: AdminDailyPoint[] = [];
  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
    const dayConfirmed = curBookings.filter(
      (b) => confirmedStatus(b.status) && createdInRange(b, d, d),
    );
    const dayCancelled = curBookings.filter(
      (b) => cancelledStatus(b.status) && createdInRange(b, d, d),
    );
    const confirmedRevenue = dayConfirmed.reduce((s, b) => s + bookingAmount(b), 0);
    dailySeries.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("es-PE", { day: "numeric", month: "short" }),
      revenue: confirmedRevenue,
      confirmedRevenue,
      cancelledRevenue: dayCancelled.reduce((s, b) => s + bookingAmount(b), 0),
      bookings: dayConfirmed.length,
    });
  }

  const typeStats: Record<string, { count: number; revenue: number }> = {};
  for (const b of curConfirmed) {
    const acc = accByName.get(b.hospedaje);
    const key = acc?.type ?? "otro";
    const cur = typeStats[key] ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += bookingAmount(b);
    typeStats[key] = cur;
  }
  const typeRevenueTotal =
    Object.values(typeStats).reduce((a, c) => a + c.revenue, 0) || 1;
  const typeDistribution: AdminTypeSlice[] = Object.entries(typeStats).map(
    ([key, stats]) => ({
      name: TYPE_LABELS[key] ?? key,
      count: stats.count,
      revenue: stats.revenue,
      percent: Math.round((stats.revenue / typeRevenueTotal) * 100),
      color: TYPE_COLORS[key] ?? TYPE_COLORS.otro,
    }),
  );

  const regionMap = new Map<string, { bookings: number; revenue: number }>();
  for (const b of curConfirmed) {
    const city = b.ciudad || "Sin ciudad";
    const cur = regionMap.get(city) ?? { bookings: 0, revenue: 0 };
    cur.bookings += 1;
    cur.revenue += bookingAmount(b);
    regionMap.set(city, cur);
  }
  const regionBars: AdminRegionBar[] = [...regionMap.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const propStats = new Map<
    string,
    { id: number; name: string; city: string; nights: number; revenue: number }
  >();
  for (const b of curConfirmed) {
    const acc = accByName.get(b.hospedaje);
    const key = b.hospedaje;
    const cur = propStats.get(key) ?? {
      id: acc?.id ?? 0,
      name: b.hospedaje,
      city: b.ciudad,
      nights: 0,
      revenue: 0,
    };
    cur.nights += nightsBetween(b.check_in, b.check_out);
    cur.revenue += bookingAmount(b);
    propStats.set(key, cur);
  }

  const reviewCountByAcc = new Map<number, number>();
  for (const r of reviews) {
    reviewCountByAcc.set(r.accommodation, (reviewCountByAcc.get(r.accommodation) ?? 0) + 1);
  }

  const topProperties: AdminTopProperty[] = [...propStats.values()]
    .map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      occupancy: Math.min(100, Math.round((p.nights / days) * 100)),
      revenue: p.revenue,
      reviewCount: reviewCountByAcc.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 5);

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const da = parseApiDate(a.created_at)?.getTime() ?? 0;
      const db = parseApiDate(b.created_at)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 5);

  const alerts: AdminAlert[] = [];
  if (pendingAccommodations.length > 0) {
    alerts.push({
      id: "pending-acc",
      priority: "high",
      icon: "pi-home",
      message: `${pendingAccommodations.length} hospedaje${pendingAccommodations.length === 1 ? "" : "s"} pendiente${pendingAccommodations.length === 1 ? "" : "s"} de aprobación`,
    });
  }
  if (pendingOwners.length > 0) {
    alerts.push({
      id: "pending-owners",
      priority: "high",
      icon: "pi-user",
      message: `${pendingOwners.length} cuenta${pendingOwners.length === 1 ? "" : "s"} de propietario por validar`,
    });
  }
  if (pendingReports > 0) {
    alerts.push({
      id: "reports",
      priority: "medium",
      icon: "pi-flag",
      message: `${pendingReports} mensaje${pendingReports === 1 ? "" : "s"} reportado${pendingReports === 1 ? "" : "s"} sin revisar`,
    });
  }
  const stalePending = curBookings.filter((b) => b.status === "pendiente").length;
  if (stalePending > 0) {
    alerts.push({
      id: "pending-bookings",
      priority: "medium",
      icon: "pi-clock",
      message: `${stalePending} reserva${stalePending === 1 ? "" : "s"} pendiente${stalePending === 1 ? "" : "s"} de confirmación`,
    });
  }

  return {
    kpis,
    dailySeries,
    typeDistribution,
    regionBars,
    topProperties,
    recentBookings,
    alerts,
    hasEnoughData: curBookings.length >= 2 || curConfirmed.length >= 1,
  };
}

export function exportDashboardCsv(snapshot: AdminDashboardSnapshot, period: string): void {
  const lines = [
    `Reporte Hospy Admin — ${period}`,
    "",
    "KPI,Valor",
    ...snapshot.kpis.map((k) => `${k.label},${k.value}`),
    "",
    "Ciudad,Reservas,Ingresos",
    ...snapshot.regionBars.map((r) => `${r.city},${r.bookings},${r.revenue}`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hospy-admin-${period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const ADMIN_REGIONS = [
  { id: "all", label: "Todas las regiones" },
  { id: "lima", label: "Lima" },
  { id: "cusco", label: "Cusco" },
  { id: "arequipa", label: "Arequipa" },
  { id: "piura", label: "Piura" },
  { id: "trujillo", label: "Trujillo" },
  { id: "iquitos", label: "Iquitos" },
];
