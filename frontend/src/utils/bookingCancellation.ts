import type { Booking } from "../api/types";

export function bookingCancelHint(b: Booking): string | null {
  if (b.can_cancel) return null;
  if (b.cancel_reason) return b.cancel_reason;
  if (b.status === "completada") {
    return "Estadía finalizada: ya no se puede cancelar. Puedes dejar una reseña.";
  }
  if (b.status === "cancelada") {
    return "Esta reserva ya fue cancelada.";
  }
  return "No disponible para cancelar en este momento.";
}
