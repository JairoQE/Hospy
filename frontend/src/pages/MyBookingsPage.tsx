import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { Booking, Paginated } from "../api/types";
import { LeaveReviewModal } from "../components/reviews/LeaveReviewModal";
import { StatusBadge } from "../components/StatusBadge";
import { PrimeIcon } from "../components/PrimeIcon";
import { bookingCancelHint } from "../utils/bookingCancellation";
import { formatApiError } from "../api/errors";
import { formatDate, formatMoney } from "../utils/format";

type ReviewTarget = {
  bookingId: number;
  accommodationId: number;
  hospedajeName: string;
  habitacion: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string | number;
};

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewMsg, setReviewMsg] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<Booking> | Booking[]>("/reservas/mias/")
      .then((data) => {
        setBookings(Array.isArray(data) ? data : data.results);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (b: Booking) => {
    const msg =
      "¿Cancelar esta reserva?\n\nSi ya pagaste, el reembolso dependerá del acuerdo con el anfitrión.";
    if (!confirm(msg)) return;
    try {
      await api.post(`/reservas/${b.id}/cancelar/`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? formatApiError((e as ApiError).data) : "Error");
    }
  };

  return (
    <div className="container page">
      <h1>Mis reservas</h1>
      <p className="muted booking-list-intro">
        Las reservas <strong>pendientes</strong> o <strong>confirmadas</strong> se pueden cancelar
        desde aquí (hasta 48 h antes del check-in). Las <strong>completadas</strong> solo permiten
        dejar reseña.
      </p>
      {reviewMsg && (
        <p className="owner-panel-msg owner-panel-msg--success" role="status">
          {reviewMsg}
        </p>
      )}
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error-msg">{error}</p>}
      {!loading && bookings.length === 0 && (
        <p className="muted">
          Aún no tienes reservas. <Link to="/">Explorar hospedajes</Link>
        </p>
      )}
      <ul className="booking-list">
        {bookings.map((b) => (
          <li key={b.id} className="card booking-item">
            <div className="booking-item-head">
              <h3>
                {b.accommodation_id != null ? (
                  <Link
                    to={`/hospedajes/${b.accommodation_id}`}
                    className="booking-item-title-link"
                  >
                    {b.hospedaje}
                  </Link>
                ) : (
                  b.hospedaje
                )}
              </h3>
              <StatusBadge status={b.status} />
            </div>
            <p>
              Hab. {b.habitacion} · {b.ciudad}
            </p>
            <p>
              {formatDate(b.check_in)} → {formatDate(b.check_out)} ·{" "}
              <strong>{formatMoney(b.total_amount)}</strong>
            </p>
            <div className="booking-item-actions">
              {b.status === "completada" && b.can_leave_review && b.accommodation_id != null && (
                <button
                  type="button"
                  className="btn btn-primary booking-review-btn"
                  onClick={() =>
                    setReviewTarget({
                      bookingId: b.id,
                      accommodationId: b.accommodation_id!,
                      hospedajeName: b.hospedaje,
                      habitacion: b.habitacion,
                      checkIn: b.check_in,
                      checkOut: b.check_out,
                      totalAmount: b.total_amount,
                    })
                  }
                >
                  <PrimeIcon name="pi-star" size={16} />
                  Dejar reseña
                </button>
              )}
              {b.status === "completada" && b.has_review && !b.can_leave_review && (
                <p className="booking-review-sent muted">
                  <PrimeIcon name="pi-check-circle" size={16} />
                  Reseña enviada — en revisión o ya publicada
                </p>
              )}
              {b.can_cancel && (
                <button type="button" className="btn btn-ghost" onClick={() => void cancel(b)}>
                  Cancelar reserva
                </button>
              )}
              {!b.can_cancel && bookingCancelHint(b) && (
                <p className="booking-cancel-hint muted">{bookingCancelHint(b)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {reviewTarget && (
        <LeaveReviewModal
          open
          accommodationId={reviewTarget.accommodationId}
          bookingId={reviewTarget.bookingId}
          hospedajeName={reviewTarget.hospedajeName}
          habitacion={reviewTarget.habitacion}
          checkIn={reviewTarget.checkIn}
          checkOut={reviewTarget.checkOut}
          totalAmount={reviewTarget.totalAmount}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewMsg("Gracias por tu reseña. Ya está visible en la ficha del hospedaje.");
            load();
          }}
        />
      )}
    </div>
  );
}
