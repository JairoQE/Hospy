import type { AccommodationListItem, Booking } from "../api/types";
import { parseApiDate } from "./format";

export type PropertyStats = {
  confirmedThisMonth: number;
  nextReservation: string | null;
};

export function statsForProperty(
  property: AccommodationListItem,
  bookings: Booking[],
): PropertyStats {
  const related = bookings.filter((b) => b.hospedaje === property.name);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const confirmedThisMonth = related.filter((b) => {
    if (b.status !== "confirmada" && b.status !== "completada") return false;
    const created = parseApiDate(b.created_at);
    return created !== null && created >= monthStart;
  }).length;

  const upcoming = related
    .filter((b) => {
      if (b.status !== "confirmada" && b.status !== "pendiente") return false;
      const checkIn = parseApiDate(b.check_in);
      return checkIn !== null && checkIn >= today;
    })
    .sort((a, b) => {
      const da = parseApiDate(a.check_in)?.getTime() ?? 0;
      const db = parseApiDate(b.check_in)?.getTime() ?? 0;
      return da - db;
    })[0];

  return {
    confirmedThisMonth,
    nextReservation: upcoming?.check_in ?? null,
  };
}

export type SortKey = "recientes" | "nombre" | "estado";

const STATUS_ORDER: Record<string, number> = {
  aprobado: 0,
  pendiente: 1,
  rechazado: 2,
};

export function sortProperties(
  items: AccommodationListItem[],
  sortBy: SortKey,
): AccommodationListItem[] {
  const copy = [...items];
  if (sortBy === "nombre") {
    return copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  if (sortBy === "estado") {
    return copy.sort((a, b) => {
      const sa = STATUS_ORDER[a.status ?? ""] ?? 9;
      const sb = STATUS_ORDER[b.status ?? ""] ?? 9;
      return sa - sb || b.id - a.id;
    });
  }
  return copy.sort((a, b) => b.id - a.id);
}

export function filterProperties(
  items: AccommodationListItem[],
  query: string,
  statusFilter: string,
): AccommodationListItem[] {
  let result = items;
  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q),
    );
  }
  if (statusFilter !== "all") {
    result = result.filter((h) => (h.status ?? "") === statusFilter);
  }
  return result;
}
