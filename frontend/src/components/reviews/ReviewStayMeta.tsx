import { formatDate, formatMoney } from "../../utils/format";

type Props = {
  habitacion?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  totalAmount?: string | number | null;
  className?: string;
};

export function ReviewStayMeta({
  habitacion,
  checkIn,
  checkOut,
  totalAmount,
  className = "review-stay-meta muted",
}: Props) {
  if (!habitacion && !checkIn && !checkOut) return null;

  const parts: string[] = [];
  if (habitacion) parts.push(`Hab. ${habitacion}`);
  if (checkIn && checkOut) {
    parts.push(`${formatDate(checkIn)} → ${formatDate(checkOut)}`);
  }
  if (totalAmount != null && totalAmount !== "") {
    parts.push(formatMoney(totalAmount));
  }

  return <p className={className}>{parts.join(" · ")}</p>;
}
