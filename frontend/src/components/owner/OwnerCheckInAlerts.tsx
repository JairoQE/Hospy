import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Booking } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { addDaysStr, compareDateStr, toDateString } from "../../utils/calendarDates";
import { formatDate } from "../../utils/format";
import { ownerTabPath } from "../../utils/ownerPanelRoutes";

type Props = {
  bookings: Booking[];
};

export function OwnerCheckInAlerts({ bookings }: Props) {
  const tomorrow = useMemo(() => addDaysStr(toDateString(new Date()), 1), []);

  const upcoming = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.status === "confirmada" || b.status === "pendiente") &&
          compareDateStr(b.check_in, tomorrow) === 0,
      ),
    [bookings, tomorrow],
  );

  if (upcoming.length === 0) return null;

  return (
    <div className="owner-checkin-alerts card" role="status">
      <div className="owner-checkin-alerts-head">
        <PrimeIcon name="pi-bell" size={18} />
        <h2>Check-ins mañana ({formatDate(tomorrow)})</h2>
      </div>
      <p className="muted">
        Prepara habitaciones y acceso. También recibirás una notificación en tu bandeja un día antes.
      </p>
      <ul className="owner-checkin-alerts-list">
        {upcoming.map((b) => (
          <li key={b.id}>
            <strong>{b.huesped.nombre}</strong>
            <span className="muted">
              {b.hospedaje} · Hab. {b.habitacion} · {formatDate(b.check_in)} →{" "}
              {formatDate(b.check_out)}
            </span>
          </li>
        ))}
      </ul>
      <Link to={ownerTabPath("reservas")} className="owner-checkin-alerts-link">
        Ver calendario y reservas
      </Link>
    </div>
  );
}
