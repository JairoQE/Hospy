import type { Booking } from "../api/types";

type PaymentSlice = NonNullable<Booking["payment"]>;

const ONLINE_METHODS = new Set(["yape", "card", "pagoefectivo"]);

/** Huésped creó la reserva pero no eligió cómo pagar en el checkout. */
export function guestNeedsPaymentChoice(booking: Booking): boolean {
  if (booking.status !== "pendiente") return false;
  const payment = booking.payment;
  if (!payment) return false;
  return payment.status === "pendiente" && !payment.method;
}

export function guestExternalPaymentAwaitingOwner(booking: Booking): boolean {
  const payment = booking.payment;
  return (
    booking.status === "pendiente" &&
    payment?.method === "externo" &&
    payment.status === "procesando"
  );
}

export function guestOnlinePaymentProcessing(booking: Booking): boolean {
  const payment = booking.payment;
  return (
    booking.status === "pendiente" &&
    payment?.status === "procesando" &&
    Boolean(payment.method && ONLINE_METHODS.has(payment.method))
  );
}

export function guestBookingPaymentHint(
  booking: Booking,
): { message: string; tone: "warn" | "info" } | null {
  if (guestNeedsPaymentChoice(booking)) {
    return {
      tone: "warn",
      message:
        "Aún no elegiste cómo pagar. Usa el botón de abajo para abrir el checkout (Yape, tarjeta, PagoEfectivo o pago directo).",
    };
  }
  if (guestExternalPaymentAwaitingOwner(booking)) {
    return {
      tone: "info",
      message:
        "Registraste pago directo. El anfitrión debe confirmar que recibió el cobro para confirmar la reserva.",
    };
  }
  if (guestOnlinePaymentProcessing(booking)) {
    return {
      tone: "info",
      message: "Tu pago en línea está en proceso. La reserva se confirmará al completarse.",
    };
  }
  if (booking.status === "pendiente" && booking.payment?.status === "pagado") {
    return {
      tone: "info",
      message: "Pago registrado. Espera la confirmación del anfitrión si aún no se actualizó el estado.",
    };
  }
  return null;
}

export function guestCanOpenPaymentCheckout(booking: Booking): boolean {
  if (!booking.payment) return false;
  if (booking.status !== "pendiente") return false;
  if (guestNeedsPaymentChoice(booking)) return true;
  if (booking.payment.status === "fallido" || booking.payment.status === "expirado") {
    return true;
  }
  return false;
}

export function guestPaymentLabel(payment: PaymentSlice): string | null {
  if (payment.status === "pagado") return "Pago completado";
  if (payment.status === "pendiente" && !payment.method) {
    return "Forma de pago sin elegir";
  }
  if (payment.method === "externo" && payment.status === "procesando") {
    return "Pago directo — esperando confirmación del anfitrión";
  }
  if (payment.status === "pendiente") return "Pago pendiente";
  if (payment.status === "procesando") return "Pago en proceso";
  if (payment.status === "fallido") return "Pago fallido — intenta de nuevo";
  if (payment.status === "expirado") return "Plazo de pago expirado — elige de nuevo";
  return null;
}
