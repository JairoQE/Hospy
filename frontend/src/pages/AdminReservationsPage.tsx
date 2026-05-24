import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { Booking, Paginated } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatMoney } from "../utils/format";

export function AdminReservationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Paginated<Booking> | Booking[]>("/reservas/")
      .then((data) => setBookings(unwrapList(data)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Reservas</h1>
      <p className="admin-page-sub">Todas las reservas de la plataforma.</p>

      {loading && <p className="admin-loading">Cargando reservas…</p>}

      {!loading && bookings.length === 0 && (
        <p className="muted">No hay reservas registradas.</p>
      )}

      {!loading && bookings.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Huésped</th>
                <th>Hospedaje</th>
                <th>Ciudad</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{formatDate(b.created_at)}</td>
                  <td>{b.huesped.nombre}</td>
                  <td>{b.hospedaje}</td>
                  <td>{b.ciudad}</td>
                  <td>{formatDate(b.check_in)}</td>
                  <td>{formatDate(b.check_out)}</td>
                  <td>{formatMoney(b.total_amount)}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-page-foot">
        <Link to="/admin">← Volver al dashboard</Link>
      </p>
    </div>
  );
}
