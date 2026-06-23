import type { Booking } from "../api/types";
import { formatDate, formatMoney } from "./format";

export function refundStatusLabel(status: string): string {
  switch (status) {
    case "pendiente":
      return "Reembolso pendiente";
    case "reportado":
      return "Reembolso reportado — confirma recepción";
    case "confirmado":
      return "Reembolso confirmado";
    case "disputado":
      return "Reportado a moderación";
    case "no_aplica":
      return "Sin reembolso";
    default:
      return status;
  }
}

export function refundSummaryLine(refund: NonNullable<Booking["refund"]>): string {
  if (refund.status === "no_aplica" || Number(refund.refund_amount) <= 0) {
    return "Sin reembolso según la política del hospedaje.";
  }
  const amount = formatMoney(refund.refund_amount);
  if (refund.refund_percent != null) {
    return `Reembolso estimado: ${amount} (${refund.refund_percent} %).`;
  }
  return `Reembolso estimado: ${amount}.`;
}

export function refundDueHint(refund: NonNullable<Booking["refund"]>): string | null {
  if (refund.status !== "pendiente" || !refund.due_at) return null;
  return `El anfitrión debe registrar el reembolso antes del ${formatDate(refund.due_at)}.`;
}
