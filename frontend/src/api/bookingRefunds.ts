import { api } from "./client";
import type { Booking, Paginated } from "./types";

export interface DisputedRefund {
  id: number;
  booking_id: number;
  hospedaje: string;
  habitacion: string;
  check_in: string;
  huesped: { id: number; email: string; nombre: string };
  propietario: {
    id: number;
    email: string;
    nombre: string;
    owner_strikes: number;
  };
  status: string;
  refund_percent: number | null;
  refund_amount: string;
  due_at: string | null;
  owner_operation_number: string;
  owner_reported_amount: string | null;
  owner_reported_at: string | null;
  dispute_notes: string;
  disputed_at: string | null;
  owner_strikes: number;
  created_at: string;
}

export function registerBookingRefund(
  bookingId: number,
  payload: { operation_number: string; reported_amount: string | number },
) {
  return api.post<{ refund: Booking["refund"]; booking: Booking }>(
    `/reservas/${bookingId}/reembolso/registrar/`,
    payload,
  );
}

export function confirmBookingRefund(bookingId: number) {
  return api.post<{ refund: Booking["refund"]; booking: Booking }>(
    `/reservas/${bookingId}/reembolso/confirmar/`,
  );
}

export function disputeBookingRefund(bookingId: number, notes = "") {
  return api.post<{ refund: Booking["refund"]; booking: Booking }>(
    `/reservas/${bookingId}/reembolso/disputar/`,
    { notes },
  );
}

export async function fetchDisputedRefunds(): Promise<DisputedRefund[]> {
  const data = await api.get<DisputedRefund[] | Paginated<DisputedRefund>>(
    "/admin/reembolsos-disputados/",
  );
  return Array.isArray(data) ? data : data.results;
}

export function resolveDisputedRefund(
  refundId: number,
  payload: { warning: string; accion: "advertencia" | "desactivar_cuenta" },
) {
  return api.post<DisputedRefund>(
    `/admin/reembolsos-disputados/${refundId}/resolver/`,
    payload,
  );
}

export function warnOwner(
  ownerId: number,
  payload: { warning: string; accion: "advertencia" | "desactivar_cuenta" },
) {
  return api.post(`/auth/propietarios/${ownerId}/amonestar/`, payload);
}
