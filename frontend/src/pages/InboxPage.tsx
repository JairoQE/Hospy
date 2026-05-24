import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { InboxItemRow } from "../components/inbox/InboxItemRow";
import { useAuth } from "../context/AuthContext";
import { useInboxChannel } from "../hooks/useInboxChannel";
import type { InboxCanal } from "../types/inbox";

export function InboxPage() {
  const { user, isRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canal = (
    searchParams.get("canal") === "mensaje" ? "mensaje" : "notificacion"
  ) as InboxCanal;

  const { items, loading, openItem, markAllRead } = useInboxChannel(canal, true);

  const roleHint = useMemo(() => {
    if (!user) return "";
    if (isRole("administrador")) {
      return "Moderación de hospedajes, alertas del sistema y mensajes del equipo.";
    }
    if (isRole("propietario")) {
      return "Reservas de huéspedes, aprobación de hospedajes y mensajes de clientes.";
    }
    return "Estado de tus reservas y mensajes de los propietarios.";
  }, [user, isRole]);

  const setCanal = (next: InboxCanal) => {
    setSearchParams({ canal: next });
  };

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div className="container page inbox-page">
      <header className="inbox-page-head">
        <h1>{canal === "mensaje" ? "Mensajes" : "Notificaciones"}</h1>
        <p className="muted">{roleHint}</p>
      </header>

      <div className="inbox-tabs">
        <button
          type="button"
          className={canal === "notificacion" ? "is-active" : ""}
          onClick={() => setCanal("notificacion")}
        >
          Notificaciones
        </button>
        <button
          type="button"
          className={canal === "mensaje" ? "is-active" : ""}
          onClick={() => setCanal("mensaje")}
        >
          Mensajes
        </button>
      </div>

      {unread > 0 && (
        <div className="inbox-toolbar">
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Marcar todo como leído
          </button>
        </div>
      )}

      {loading && <p className="muted">Cargando…</p>}

      {!loading && items.length === 0 && (
        <div className="card inbox-empty">
          <p className="muted">
            {canal === "mensaje"
              ? "No tienes mensajes por ahora."
              : "No tienes notificaciones nuevas."}
          </p>
          <Link to="/" className="btn btn-primary">
            Explorar hospedajes
          </Link>
        </div>
      )}

      <ul className="inbox-list">
        {items.map((item) => (
          <li key={item.id}>
            <InboxItemRow item={item} onClick={() => openItem(item)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
