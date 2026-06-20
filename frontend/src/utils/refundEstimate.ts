import type { Booking } from "../api/types";
import { formatMoney } from "./format";

export type RefundIfCancelNow = {
  percent: number | null;
  label: string;
  policy_type: string;
};

export function formatRefundIfCancelNow(
  refund: RefundIfCancelNow | null | undefined,
  totalAmount: string | number,
): string | null {
  if (!refund) return null;
  if (refund.percent === null) return refund.label;
  if (refund.percent === 0) return refund.label;
  const amount =
    typeof totalAmount === "string" ? parseFloat(totalAmount) : totalAmount;
  if (!Number.isFinite(amount)) return refund.label;
  const refundAmount = (amount * refund.percent) / 100;
  return `${refund.label} Estimado: ${formatMoney(refundAmount)} (${refund.percent} %).`;
}

export function refundCancelConfirmMessage(b: Booking): string {
  const base =
    "¿Cancelar esta reserva?\n\nSi ya pagaste, el reembolso depende de la política del anfitrión.";
  const detail = formatRefundIfCancelNow(b.refund_if_cancel_now, b.total_amount);
  return detail ? `${base}\n\n${detail}` : base;
}
