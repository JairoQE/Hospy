import { api } from "./client";

export type OwnerCalendarDayStatus = "libre" | "parcial" | "ocupado";

export interface OwnerCalendarBookingBrief {
  id: number;
  hospedaje: string;
  accommodation_id: number;
  habitacion: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  is_check_in_day: boolean;
}

export interface OwnerCalendarDay {
  date: string;
  status: OwnerCalendarDayStatus;
  occupied_rooms: number;
  total_rooms: number;
  check_ins_count: number;
  bookings: OwnerCalendarBookingBrief[];
}

export interface OwnerCalendarResponse {
  anio: number;
  mes: number;
  accommodation_id: number | null;
  total_rooms: number;
  days: OwnerCalendarDay[];
}

export async function fetchOwnerCalendar(
  year: number,
  month: number,
  accommodationId?: number | null,
): Promise<OwnerCalendarResponse> {
  const params = new URLSearchParams({
    anio: String(year),
    mes: String(month),
  });
  if (accommodationId != null) {
    params.set("hospedaje_id", String(accommodationId));
  }
  return api.get<OwnerCalendarResponse>(`/propietario/calendario/?${params.toString()}`);
}
