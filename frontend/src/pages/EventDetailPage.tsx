import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { fetchActifyEvent, type ActifyEvent } from "../api/actify";
import { PrimeIcon } from "../components/PrimeIcon";
import { formatDate, formatMoney } from "../utils/format";
import "../styles/events-page.css";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<ActifyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchActifyEvent(id);
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) {
          setEvent(null);
          setError(e instanceof ApiError ? e.message : "No se pudo cargar el evento");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container page events-page">
        <p className="muted">Cargando evento…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container page events-page">
        <p className="form-error" role="alert">
          {error || "Evento no encontrado"}
        </p>
        <Link to="/eventos" className="btn btn-secondary">
          Volver a eventos
        </Link>
      </div>
    );
  }

  const cap = event.capacity || {};

  return (
    <div className="container page events-page events-detail">
      <Link to="/eventos" className="events-back">
        ← Volver a eventos
      </Link>
      <header className="events-detail-hero">
        <div className="events-card-top">
          {event.category?.name ? (
            <span className="events-chip">{event.category.name}</span>
          ) : null}
          {cap.is_sold_out ? (
            <span className="events-chip events-chip--sold">Agotado</span>
          ) : (
            <span className="events-chip events-chip--ok">Cupos disponibles</span>
          )}
        </div>
        <h1>{event.name}</h1>
        <p className="events-meta">
          <PrimeIcon name="pi-calendar" size={16} />
          {event.start_date ? formatDate(event.start_date) : "—"}
          {event.end_date ? ` → ${formatDate(event.end_date)}` : ""}
        </p>
        <p className="events-meta">
          <PrimeIcon name="pi-map-marker" size={16} />
          {[event.location?.city, event.location?.address].filter(Boolean).join(" · ") || "—"}
        </p>
        {event.organizer?.name ? (
          <p className="events-meta">
            <PrimeIcon name="pi-user" size={16} />
            Organizador: {event.organizer.name}
          </p>
        ) : null}
      </header>

      <section className="card events-detail-section">
        <h2>Descripción</h2>
        <p className="events-desc">{event.description || "Sin descripción."}</p>
      </section>

      <section className="card events-detail-section">
        <h2>Aforo en vivo</h2>
        <dl className="events-capacity">
          <div>
            <dt>Capacidad máxima</dt>
            <dd>{cap.max_capacity ?? "—"}</dd>
          </div>
          <div>
            <dt>Tickets vendidos</dt>
            <dd>{cap.sold_tickets ?? "—"}</dd>
          </div>
          <div>
            <dt>Cupos libres</dt>
            <dd>{cap.available_spots ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="card events-detail-section">
        <h2>Tipos de entrada</h2>
        {event.ticket_types?.length ? (
          <ul className="events-tickets">
            {event.ticket_types.map((t) => {
              const price = Number(t.price);
              const label =
                !Number.isFinite(price) || price <= 0
                  ? "Gratis"
                  : formatMoney(price, {
                      currency: t.currency === "USD" ? "USD" : "PEN",
                    });
              return (
                <li key={`${t.name}-${t.price}`}>
                  <strong>{t.name}</strong>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Sin tipos de entrada publicados.</p>
        )}
      </section>

      <p className="muted events-source">Fuente: Actify · estado {event.status || "publicado"}</p>
    </div>
  );
}
