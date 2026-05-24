import { statusLabel } from "../utils/format";

const STATUS_CLASS: Record<string, string> = {
  pendiente: "badge-warn",
  confirmada: "badge-ok",
  completada: "badge-ok",
  cancelada: "badge-muted",
  rechazada: "badge-danger",
  aprobado: "badge-ok",
  rechazado: "badge-danger",
  aprobada: "badge-ok",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? "badge-muted"}`}>
      {statusLabel(status)}
    </span>
  );
}
