import type { OwnerBookingHint } from "../../utils/ownerBookingHints";

interface Props {
  hint: OwnerBookingHint;
}

export function OwnerBookingHintBox({ hint }: Props) {
  return (
    <div className={`owner-booking-hint owner-booking-hint--${hint.tone}`} role="note">
      <strong>{hint.label}</strong>
      <p>{hint.detail}</p>
    </div>
  );
}
