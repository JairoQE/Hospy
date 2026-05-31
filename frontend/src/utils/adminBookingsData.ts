import type { Booking } from "../api/types";
import type { SortDir } from "./adminUsersData";

export type BookingStatusFilter =
  | "all"
  | "pendiente"
  | "confirmada"
  | "completada"
  | "cancelada";

export interface BookingMetrics {
  revenueMonth: number;
  revenueAll: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  cancelRate: number;
  total: number;
}

export interface DailyBookingPoint {
  date: string;
  count: number;
  revenue: number;
}

function parseAmount(v: string | number): number {
  return Number(v) || 0;
}

function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function isUpcomingBooking(b: Booking, withinDays = 7): boolean {
  if (!["pendiente", "confirmada"].includes(b.status)) return false;
  const d = daysUntil(b.check_in);
  return d >= 0 && d <= withinDays;
}

export function isSoonCheckIn(b: Booking): boolean {
  if (!["pendiente", "confirmada"].includes(b.status)) return false;
  const d = daysUntil(b.check_in);
  return d >= 0 && d <= 3;
}

export function computeBookingMetrics(bookings: Booking[]): BookingMetrics {
  const now = new Date();
  const completed = bookings.filter((b) => b.status === "completada").length;
  const cancelled = bookings.filter((b) => b.status === "cancelada").length;
  const upcoming = bookings.filter((b) => isUpcomingBooking(b)).length;
  const revenueAll = bookings
    .filter((b) => b.status !== "cancelada")
    .reduce((s, b) => s + parseAmount(b.total_amount), 0);
  const revenueMonth = bookings
    .filter((b) => b.status !== "cancelada" && isSameMonth(b.created_at, now))
    .reduce((s, b) => s + parseAmount(b.total_amount), 0);
  const total = bookings.length;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  return {
    revenueMonth,
    revenueAll,
    completed,
    cancelled,
    upcoming,
    cancelRate,
    total,
  };
}

export function buildDailySeries(bookings: Booking[], days = 30): DailyBookingPoint[] {
  const map = new Map<string, { count: number; revenue: number }>();
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { count: 0, revenue: 0 });
  }
  for (const b of bookings) {
    const key = b.created_at.slice(0, 10);
    if (!map.has(key)) continue;
    const cur = map.get(key)!;
    cur.count += 1;
    if (b.status !== "cancelada") cur.revenue += parseAmount(b.total_amount);
    map.set(key, cur);
  }
  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}

export function matchesBookingSearch(b: Booking, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    String(b.id),
    b.huesped.nombre,
    b.huesped.email,
    b.hospedaje,
    b.ciudad,
    b.habitacion,
  ].some((f) => (f ?? "").toLowerCase().includes(needle));
}

export function matchesStatusFilter(b: Booking, filter: BookingStatusFilter): boolean {
  if (filter === "all") return true;
  return b.status === filter;
}

export function matchesCityFilter(b: Booking, city: string): boolean {
  if (!city) return true;
  return b.ciudad === city;
}

export function matchesDateRange(
  b: Booking,
  from: string,
  to: string,
  field: "check_in" | "created_at",
): boolean {
  const val = b[field].slice(0, 10);
  if (from && val < from) return false;
  if (to && val > to) return false;
  return true;
}

export function sortBookings(
  rows: Booking[],
  key: string,
  dir: SortDir,
): Booking[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va: string | number = 0;
    let vb: string | number = 0;
    switch (key) {
      case "id":
        va = a.id;
        vb = b.id;
        break;
      case "created":
        va = a.created_at;
        vb = b.created_at;
        break;
      case "guest":
        va = a.huesped.nombre.toLowerCase();
        vb = b.huesped.nombre.toLowerCase();
        break;
      case "hospedaje":
        va = a.hospedaje.toLowerCase();
        vb = b.hospedaje.toLowerCase();
        break;
      case "check_in":
        va = a.check_in;
        vb = b.check_in;
        break;
      case "amount":
        va = parseAmount(a.total_amount);
        vb = parseAmount(b.total_amount);
        break;
      default:
        return 0;
    }
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return 0;
  });
}

export function adminCanCancel(b: Booking): boolean {
  return ["pendiente", "confirmada"].includes(b.status);
}
