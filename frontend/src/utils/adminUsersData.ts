import type { AdminUserListItem, Booking } from "../api/types";

export type UsersTab = "propietarios" | "patrocinadores" | "huespedes" | "todos";

export type UsersStatusFilter = "all" | "pendiente" | "aprobado" | "rechazado" | "inactivo";

export type SortDir = "asc" | "desc";

export interface GuestInsights {
  bookingsCount: number;
  totalSpend: number;
  lastBookingAt: string | null;
  hasActiveBooking: boolean;
}

export interface AdminUsersMetrics {
  totalUsers: number;
  activeAccounts: number;
  pendingModeration: number;
  guestsWithBookings: number;
  totalBookings: number;
  guestRevenue: number;
  ownersApproved: number;
  sponsorsApproved: number;
}

export function buildGuestInsights(bookings: Booking[]): Map<number, GuestInsights> {
  const map = new Map<number, GuestInsights>();
  const activeStatuses = new Set(["pendiente", "confirmada"]);

  for (const b of bookings) {
    const id = b.huesped.id;
    const amount = Number(b.total_amount) || 0;
    const cur = map.get(id) ?? {
      bookingsCount: 0,
      totalSpend: 0,
      lastBookingAt: null,
      hasActiveBooking: false,
    };
    cur.bookingsCount += 1;
    cur.totalSpend += amount;
    if (!cur.lastBookingAt || b.created_at > cur.lastBookingAt) {
      cur.lastBookingAt = b.created_at;
    }
    if (activeStatuses.has(b.status)) {
      cur.hasActiveBooking = true;
    }
    map.set(id, cur);
  }
  return map;
}

export function computeAdminUsersMetrics(
  users: AdminUserListItem[],
  pendingOwners: number,
  pendingSponsors: number,
  guestInsights: Map<number, GuestInsights>,
  bookings: Booking[],
): AdminUsersMetrics {
  const guestRevenue = [...guestInsights.values()].reduce((s, g) => s + g.totalSpend, 0);
  return {
    totalUsers: users.length,
    activeAccounts: users.filter((u) => u.is_active).length,
    pendingModeration: pendingOwners + pendingSponsors,
    guestsWithBookings: guestInsights.size,
    totalBookings: bookings.length,
    guestRevenue,
    ownersApproved: users.filter(
      (u) => u.role === "propietario" && u.moderation_status === "aprobado",
    ).length,
    sponsorsApproved: users.filter(
      (u) => u.role === "patrocinador" && u.moderation_status === "aprobado",
    ).length,
  };
}

export function matchesStatusFilter(
  user: AdminUserListItem,
  filter: UsersStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "inactivo") return !user.is_active;
  if (filter === "pendiente") return user.moderation_status === "pendiente";
  if (filter === "aprobado") {
    if (user.role === "huesped" || user.role === "administrador") {
      return user.is_active;
    }
    return user.moderation_status === "aprobado";
  }
  if (filter === "rechazado") return user.moderation_status === "rechazado";
  return true;
}

export function matchesGuestQuickFilter(
  insights: GuestInsights | undefined,
  filter: "all" | "30d" | "5plus" | "highSpend",
  avgSpend: number,
): boolean {
  if (filter === "all") return true;
  if (!insights) return false;
  if (filter === "5plus") return insights.bookingsCount >= 5;
  if (filter === "highSpend") return insights.totalSpend >= avgSpend && insights.totalSpend > 0;
  if (filter === "30d" && insights.lastBookingAt) {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return new Date(insights.lastBookingAt).getTime() >= cutoff;
  }
  return false;
}

export function sortUsers(
  rows: AdminUserListItem[],
  key: string,
  dir: SortDir,
  guestInsights: Map<number, GuestInsights>,
): AdminUserListItem[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va: string | number = 0;
    let vb: string | number = 0;
    switch (key) {
      case "name":
        va = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
        vb = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
        break;
      case "email":
        va = a.email.toLowerCase();
        vb = b.email.toLowerCase();
        break;
      case "bookings":
        va = guestInsights.get(a.id)?.bookingsCount ?? a.bookings_count;
        vb = guestInsights.get(b.id)?.bookingsCount ?? b.bookings_count;
        break;
      case "spend":
        va = guestInsights.get(a.id)?.totalSpend ?? 0;
        vb = guestInsights.get(b.id)?.totalSpend ?? 0;
        break;
      case "joined":
        va = a.date_joined;
        vb = b.date_joined;
        break;
      case "hospedajes":
        va = a.hospedajes_count;
        vb = b.hospedajes_count;
        break;
      default:
        return 0;
    }
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return 0;
  });
}

export function exportTableCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
