import { PrimeIcon } from "../PrimeIcon";

export const DEFAULT_CHECK_IN_TIME = "13:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

type Props = {
  checkInFrom?: string | null;
  checkOutUntil?: string | null;
  checkInInstructions?: string | null;
  checkOutInstructions?: string | null;
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
  checkInInstructions,
  checkOutInstructions,
  className = "property-section",
}: Props) {
  const checkIn = formatTimeLabel(checkInFrom, DEFAULT_CHECK_IN_TIME);
  const checkOut = formatTimeLabel(checkOutUntil, DEFAULT_CHECK_OUT_TIME);
  const hasCustom =
    Boolean((checkInInstructions ?? "").trim()) ||
    Boolean((checkOutInstructions ?? "").trim());

  return (
    <section
      className={className}
      id="politica-checkin-checkout"
      aria-labelledby="check-policy-title"
    >
      <h2 id="check-policy-title">Políticas de check-in y check-out</h2>
      <p className="muted cancellation-policy-intro">
        Horarios e instrucciones definidos por el anfitrión de este alojamiento.
      </p>
      <ul className="cancellation-policy-list">
        <li>
          <PrimeIcon name="pi-sign-in" size={18} />
          <span>
            <strong>Check-in</strong> desde las <strong>{checkIn}</strong> (hora local).
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-sign-out" size={18} />
          <span>
            <strong>Check-out</strong> hasta las <strong>{checkOut}</strong>.
          </span>
        </li>
        {(checkInInstructions ?? "").trim() && (
          <li>
            <PrimeIcon name="pi-map-marker" size={18} />
            <span>{checkInInstructions!.trim()}</span>
          </li>
        )}
        {(checkOutInstructions ?? "").trim() && (
          <li>
            <PrimeIcon name="pi-key" size={18} />
            <span>{checkOutInstructions!.trim()}</span>
          </li>
        )}
        {!hasCustom && (
          <li>
            <PrimeIcon name="pi-comments" size={18} />
            <span>
              Tras confirmar la reserva, el anfitrión puede enviar instrucciones de acceso por
              mensaje.
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
