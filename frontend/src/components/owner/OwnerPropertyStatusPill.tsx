import { statusLabel } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";

const PILL_CLASS: Record<string, string> = {
  aprobado: "owner-status-pill--approved",
  pendiente: "owner-status-pill--pending",
  rechazado: "owner-status-pill--rejected",
};

type Props = {
  status: string;
};

export function OwnerPropertyStatusPill({ status }: Props) {
  const variant = PILL_CLASS[status] ?? "owner-status-pill--muted";
  const showCheck = status === "aprobado";

  return (
    <span className={`owner-status-pill ${variant}`}>
      {showCheck && <PrimeIcon name="pi-check" size={14} />}
      {statusLabel(status)}
    </span>
  );
}
