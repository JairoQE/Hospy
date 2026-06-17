import { PrimeIcon } from "../PrimeIcon";

export const DEFAULT_CHECK_IN_TIME = "13:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

type Props = {
  checkInFrom?: string | null;
  checkOutUntil?: string | null;
  className?: string;
};

function formatTimeLabel(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function CheckInCheckOutPolicySection({
  checkInFrom,
  checkOutUntil,
  className = "property-section",
}: Props) {
  const checkIn = formatTimeLabel(checkInFrom, DEFAULT_CHECK_IN_TIME);
  const checkOut = formatTimeLabel(checkOutUntil, DEFAULT_CHECK_OUT_TIME);

  return (
    <section
      className={className}
      id="politica-checkin-checkout"
      aria-labelledby="check-policy-title"
    >
      <h2 id="check-policy-title">Políticas de check-in y check-out</h2>
      <p className="muted cancellation-policy-intro">
        Horarios estándar de Hospy para este alojamiento. El anfitrión puede confirmar detalles
        por mensaje tras la reserva.
      </p>
      <ul className="cancellation-policy-list">
        <li>
          <PrimeIcon name="pi-sign-in" size={18} />
          <span>
            <strong>Check-in</strong> desde las <strong>{checkIn}</strong> (hora local del
            hospedaje).
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-sign-out" size={18} />
          <span>
            <strong>Check-out</strong> hasta las <strong>{checkOut}</strong>.
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-id-card" size={18} />
          <span>
            Presenta <strong>DNI o pasaporte</strong> a la llegada; el nombre debe coincidir con la
            reserva.
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-clock" size={18} />
          <span>
            Entrada anticipada o salida tardía solo si el anfitrión lo confirma y hay
            disponibilidad.
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-comments" size={18} />
          <span>
            Tras confirmar la reserva, el anfitrión envía instrucciones de acceso y contacto en la
            bandeja de mensajes.
          </span>
        </li>
      </ul>
    </section>
  );
}
