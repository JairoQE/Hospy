import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { Booking, Paginated, User } from "../api/types";
import { displayName } from "../utils/format";

export function AdminUsersPage() {
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      api.get<Paginated<Booking> | Booking[]>("/reservas/"),
    ])
      .then(([owners, b]) => {
        setPendingOwners(unwrapList(owners));
        setBookings(unwrapList(b));
      })
      .finally(() => setLoading(false));
  }, []);

  const guests = useMemo(() => {
    const map = new Map<number, { user: Booking["huesped"]; count: number }>();
    for (const b of bookings) {
      const cur = map.get(b.huesped.id);
      if (cur) cur.count += 1;
      else map.set(b.huesped.id, { user: b.huesped, count: 1 });
    }
    return [...map.values()].sort((a, c) => c.count - a.count);
  }, [bookings]);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Usuarios</h1>
      <p className="admin-page-sub">
        Propietarios en revisión y huéspedes con actividad de reservas.
      </p>

      {loading && <p className="admin-loading">Cargando…</p>}

      {!loading && (
        <>
          <section className="admin-moderation-section">
            <h2 className="admin-section-title">Propietarios pendientes ({pendingOwners.length})</h2>
            {pendingOwners.length === 0 ? (
              <p className="muted">Sin cuentas pendientes.</p>
            ) : (
              <ul className="admin-card-list">
                {pendingOwners.map((o) => (
                  <li key={o.id} className="admin-card-item">
                    <strong>{displayName(o)}</strong>
                    <span className="muted"> · {o.email}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/moderacion" className="admin-link-btn">
              Ir a moderación
            </Link>
          </section>

          <section className="admin-moderation-section">
            <h2 className="admin-section-title">Huéspedes con reservas ({guests.length})</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Reservas</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.user.id}>
                      <td>{g.user.nombre}</td>
                      <td>{g.user.email}</td>
                      <td>{g.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
