import type { Booking } from "../api/types";

export type OwnerBookingHintTone = "info" | "warning" | "success" | "muted";

export type OwnerBookingHint = {
  tone: OwnerBookingHintTone;
  label: string;
  detail: string;
};

type PaymentSlice = NonNullable<Booking["payment"]>;

export function ownerBookingPaymentLabel(payment: PaymentSlice): string {
  if (payment.status === "pagado") return "Pago recibido";
  if (payment.method === "externo" && payment.status === "procesando") {
    return "Pago directo — esperando tu confirmación";
  }
  if (payment.status === "pendiente") return "Pago en plataforma pendiente";
  if (payment.status === "procesando") return "Pago en proceso";
  if (payment.status === "fallido") return "Pago fallido";
  if (payment.status === "expirado") return "Plazo de pago expirado";
  if (payment.status === "cancelado") return "Pago cancelado";
  return `Pago: ${payment.status}`;
}

/** Explica qué pasó y qué debe hacer el propietario. */
export function ownerBookingHint(booking: Booking): OwnerBookingHint | null {
  const payment = booking.payment;
  const status = booking.status;

  if (status === "cancelada") {
    return {
      tone: "muted",
      label: "Reserva cancelada",
      detail: "Esta solicitud ya no está activa. No requiere acción.",
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
    if (status === "pendiente") {
      return {
        tone: "info",
        label: "Nueva solicitud",
        detail:
          "El huésped reservó sin pasar por el checkout de pago. Confirma si aceptas las fechas o rechaza la solicitud.",
      };
    }
    if (status === "confirmada") {
      return {
        tone: "warning",
        label: "Confirmada sin registro de pago",
        detail:
          "Aceptaste la estadía pero no hay pago registrado en Hospy. Coordina el cobro directamente con el huésped.",
      };
    }
    return null;
  }

  const isExternalPending =
    payment.method === "externo" && payment.status === "procesando";

  if (status === "pendiente" && isExternalPending) {
    return {
      tone: "warning",
      label: "Pago directo con el huésped",
      detail:
        "El huésped eligió pagarte fuera de Hospy (transferencia, Yape, efectivo). Cuando recibas el dinero, usa «Confirmar pago recibido» para registrar el cobro y confirmar la reserva.",
    };
  }

  if (status === "pendiente" && payment.status === "pagado") {
    return {
      tone: "success",
      label: "Pago completado en Hospy",
      detail:
        "El huésped ya pagó por la plataforma. Confirma la reserva para bloquear las fechas y avisarle.",
    };
  }

  if (status === "pendiente" && payment.status === "pendiente") {
    return {
      tone: "info",
      label: "Reserva creada, pago pendiente",
      detail:
        "El huésped reservó pero aún no paga en línea. Puedes esperar el pago, coordinar cobro directo con él por chat, o rechazar si no te conviene.",
    };
  }

  if (status === "confirmada" && payment.status === "pendiente") {
    return {
      tone: "warning",
      label: "Estadía confirmada, pago sin cerrar",
      detail:
        "Confirmaste la reserva manualmente, pero el pago en plataforma sigue pendiente. El huésped aún podría pagar en línea o puedes cobrarle por fuera.",
    };
  }

  if (status === "confirmada" && isExternalPending) {
    return {
      tone: "warning",
      label: "Estadía confirmada sin registrar el cobro",
      detail:
        "La reserva ya está confirmada, pero el pago directo no fue marcado como recibido. Si ya cobraste, usa «Confirmar pago recibido» para dejar constancia en Hospy.",
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

  if (status === "confirmada") {
    return {
      tone: "info",
      label: "Estadía confirmada",
      detail:
        "Las fechas están bloqueadas para este huésped. Marca completada cuando termine la estadía.",
    };
  }

  return null;
}

export function ownerBookingAwaitingExternalPayment(booking: Booking): boolean {
  const payment = booking.payment;
  return (
    booking.status === "pendiente" &&
    payment?.method === "externo" &&
    payment.status === "procesando"
  );
}

export function ownerBookingShowManualConfirm(booking: Booking): boolean {
  if (booking.status !== "pendiente") return false;
  if (ownerBookingAwaitingExternalPayment(booking)) return false;
  return true;
}
