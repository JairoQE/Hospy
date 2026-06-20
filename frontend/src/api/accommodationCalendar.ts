import { api } from "./client";
import type { PricingModel } from "../utils/pricingModel";

export type CalendarDayStatus =
  | "disponible"
  | "parcial"
  | "ocupado"
  | "bloqueado"
  | "inactiva";

export interface AccommodationCalendarDay {
  date: string;
  status: CalendarDayStatus;
  available: boolean;
  rooms_available?: number;
  rooms_total?: number;
}

export interface AccommodationCalendarResponse {
  accommodation_id: number;
  pricing_model: PricingModel;
  anio: number;
  mes: number;
  days: AccommodationCalendarDay[];
}

export async function fetchAccommodationCalendar(
  accommodationId: number,
  year: number,
  month: number,
): Promise<AccommodationCalendarResponse> {
  return api.get<AccommodationCalendarResponse>(
    `/hospedajes/${accommodationId}/disponibilidad/?anio=${year}&mes=${month}`,
  );
}
