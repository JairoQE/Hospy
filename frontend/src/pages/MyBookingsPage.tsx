import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { Booking, Paginated } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatMoney } from "../utils/format";

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const cancel = async (id: number) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    try {
      await api.post(`/reservas/${id}/cancelar/`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  return (
    <div className="container page">
      <h1>Mis reservas</h1>
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
              <h3>{b.hospedaje}</h3>
              <StatusBadge status={b.status} />
            </div>
            <p>
              Hab. {b.habitacion} · {b.ciudad}
            </p>
            <p>
              {formatDate(b.check_in)} → {formatDate(b.check_out)} ·{" "}
              <strong>{formatMoney(b.total_amount)}</strong>
            </p>
            {["pendiente", "confirmada"].includes(b.status) && (
              <button type="button" className="btn btn-ghost" onClick={() => cancel(b.id)}>
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
