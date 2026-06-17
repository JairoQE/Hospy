import type { Booking } from "../api/types";

export type OwnerBookingHintTone = "info" | "warning" | "success" | "muted";

export type OwnerBookingHint = {
  tone: OwnerBookingHintTone;
  label: string;
  detail: string;
};

type PaymentSlice = NonNullable<Booking["payment"]>;

const ONLINE_METHODS = new Set(["yape", "card", "pagoefectivo"]);

export function ownerBookingPaymentLabel(payment: PaymentSlice): string {
  if (payment.status === "pagado") return "Pago registrado en Hospy";
  if (payment.method === "externo" && payment.status === "procesando") {
    return "Pago directo — esperando tu confirmación";
  }
  if (payment.status === "pendiente") return "Esperando pago del huésped";
  if (payment.status === "procesando" && ONLINE_METHODS.has(payment.method || "")) {
    return "Pago en pasarela — confirmación automática";
  }
  if (payment.status === "procesando") return "Pago en proceso";
  if (payment.status === "fallido") return "Pago fallido";
  if (payment.status === "expirado") return "Plazo de pago expirado";
  if (payment.status === "cancelado") return "Pago cancelado";
  return `Pago: ${payment.status}`;
}

function isExternalPending(payment: PaymentSlice): boolean {
  return payment.method === "externo" && payment.status === "procesando";
}

/** Propietario puede registrar cobro directo (no pasarela en curso). */
export function ownerCanRecordExternalPayment(booking: Booking): boolean {
  const payment = booking.payment;
  if (!payment || payment.status === "pagado") return false;
  if (booking.status !== "pendiente" && booking.status !== "confirmada") return false;
  if (ONLINE_METHODS.has(payment.method || "") && payment.status === "procesando") {
    return false;
  }
  return true;
}

export function ownerBookingShowReject(booking: Booking): boolean {
  return booking.status === "pendiente";
}

/** Explica qué pasó y qué debe hacer el propietario. */
export function ownerBookingHint(booking: Booking): OwnerBookingHint | null {
  const payment = booking.payment;
  const status = booking.status;

  if (status === "cancelada") {
    return {
      tone: "muted",
      label: "Reserva cancelada",
      detail: "Esta solicitud ya no está activa.",
    };
  }

  if (status === "completada") {
    return {
      tone: "success",
      label: "Estadía finalizada",
      detail: "El huésped ya completó su estadía según las fechas acordadas.",
    };
  }

  if (!payment) {
    return {
      tone: "warning",
      label: "Sin registro de pago",
      detail:
        "Esta reserva no tiene pago en Hospy. Las nuevas reservas siempre generan un pago al reservar.",
    };
  }

  if (status === "confirmada" && payment.status === "pagado") {
    return {
      tone: "success",
      label: "Todo en orden",
      detail:
        "Reserva confirmada y pago registrado. Después del check-out, marca la estadía como completada.",
    };
  }

  if (
    payment.status === "procesando" &&
    ONLINE_METHODS.has(payment.method || "")
  ) {
    return {
      tone: "info",
      label: "Pago por pasarela de Hospy",
      detail:
        "El huésped está pagando en línea (Yape, tarjeta o PagoEfectivo). Cuando el cobro se complete, la reserva se confirmará sola; no necesitas hacer nada.",
    };
  }

  if (status === "pendiente" && payment.status === "pagado") {
    return {
      tone: "success",
      label: "Pago recibido por la pasarela",
      detail: "El cobro ya está registrado. La reserva debería estar confirmada; recarga si no ves el cambio.",
    };
  }

  if (isExternalPending(payment)) {
    return {
      tone: "warning",
      label: "Pago directo con el huésped",
      detail:
        "El huésped pagará o ya pagó fuera de Hospy. Cuando tengas el dinero, pulsa «Confirmar pago recibido» para registrar el cobro y confirmar la reserva.",
    };
  }

  if (status === "pendiente" && payment.status === "pendiente") {
    return {
      tone: "info",
      label: "Esperando pago",
      detail:
        "El huésped debe pagar en el checkout: por pasarela (confirmación automática) o pago directo (tú confirmas el cobro aquí). También puedes rechazar la solicitud.",
    };
  }

  if (status === "confirmada" && payment.status === "pendiente") {
    return {
      tone: "warning",
      label: "Reserva confirmada sin cobro registrado",
      detail:
        "Si cobraste por fuera de la pasarela, usa «Confirmar pago recibido» para dejar el pago en la base de datos.",
    };
  }

  if (status === "confirmada") {
    return {
      tone: "info",
      label: "Estadía confirmada",
      detail: "Marca completada cuando termine la estadía.",
    };
  }

  return null;
}

/** @deprecated use ownerCanRecordExternalPayment */
export function ownerBookingAwaitingExternalPayment(booking: Booking): boolean {
  const payment = booking.payment;
  return (
    booking.status === "pendiente" &&
    payment?.method === "externo" &&
    payment.status === "procesando"
  );
}

/** Ya no se confirma la estadía a mano: pasarela automática o pago directo. */
export function ownerBookingShowManualConfirm(_booking: Booking): boolean {
  return false;
}
