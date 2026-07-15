import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  fetchActifyEvents,
  type ActifyEvent,
} from "../api/actify";
import { PrimeIcon } from "../components/PrimeIcon";
import { formatDate, formatMoney } from "../utils/format";
import "../styles/events-page.css";

function eventDateRange(ev: ActifyEvent): string {
  const a = ev.start_date ? formatDate(ev.start_date) : "—";
  const b = ev.end_date ? formatDate(ev.end_date) : "";
  return b && b !== a ? `${a} → ${b}` : a;
}

function lowestTicket(ev: ActifyEvent): string | null {
  if (!ev.ticket_types?.length) return null;
  const prices = ev.ticket_types
    .map((t) => Number(t.price))
    .filter((n) => Number.isFinite(n));
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const currency = ev.ticket_types[0]?.currency || "PEN";
  if (min <= 0) return "Gratis";
  return formatMoney(min, { currency: currency === "USD" ? "USD" : "PEN" });
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<ActifyEvent[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState(searchParams.get("city") || searchParams.get("location") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const location = city.trim();
      const res = await fetchActifyEvents({
        location: location || undefined,
        city: location || undefined,
        page,
        per_page: 12,
      });
      setEvents(res.events || []);
      setCount(res.count ?? res.events?.length ?? 0);
    } catch (e) {
      setEvents([]);
      setCount(0);
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudieron cargar los eventos de Actify",
      );
    } finally {
      setLoading(false);
    }
  }, [city, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFilter = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (city.trim()) next.set("location", city.trim());
    next.set("page", "1");
    setPage(1);
    setSearchParams(next);
  };

  const hasMore = useMemo(() => events.length >= 12, [events.length]);

  return (
    <div className="container page events-page">
      <header className="events-hero">
        <p className="events-kicker">Integración · Actify</p>
        <h1>Eventos cerca de tu viaje</h1>
        <p className="events-lead">
          Catálogo público de eventos (conciertos, tecnologia, cultura…) vía la API de{" "}
          <strong>Actify</strong>. Hospy solo consulta eventos publicados; la API Key vive en el
          servidor.
        </p>
        <form className="events-filter" onSubmit={onFilter}>
          <label>
            Ciudad o ubicación
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Lima, Madrid…"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Buscar
          </button>
        </form>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="muted">Cargando eventos…</p> : null}

      {!loading && !error && events.length === 0 ? (
        <p className="muted">No hay eventos publicados para esta búsqueda.</p>
      ) : null}

      <div className="events-grid">
        {events.map((ev) => {
          const price = lowestTicket(ev);
          return (
            <article key={ev.id} className="events-card">
              <div className="events-card-top">
                {ev.category?.name ? (
                  <span className="events-chip">{ev.category.name}</span>
                ) : null}
                {ev.capacity?.is_sold_out ? (
                  <span className="events-chip events-chip--sold">Agotado</span>
                ) : (
                  <span className="events-chip events-chip--ok">Disponible</span>
                )}
              </div>
              <h2>
                <Link to={`/eventos/${ev.id}`}>{ev.name}</Link>
              </h2>
              <p className="events-meta">
                <PrimeIcon name="pi-calendar" size={14} />
                {eventDateRange(ev)}
              </p>
              <p className="events-meta">
                <PrimeIcon name="pi-map-marker" size={14} />
                {[ev.location?.city, ev.location?.address].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="events-desc">{ev.description}</p>
              <div className="events-card-foot">
                <span className="muted">
                  {ev.capacity?.available_spots ?? "—"} cupos libres
                  {ev.capacity?.max_capacity != null
                    ? ` / ${ev.capacity.max_capacity}`
                    : ""}
                </span>
                <strong>{price ?? "Ver entradas"}</strong>
              </div>
              <Link to={`/eventos/${ev.id}`} className="btn btn-secondary btn-sm">
                Ver detalle
              </Link>
            </article>
          );
        })}
      </div>

      {!loading && events.length > 0 ? (
        <div className="events-pager">
          <p className="muted">
            Mostrando {events.length}
            {count ? ` de ~${count}` : ""} eventos
          </p>
          <div className="events-pager-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                const sp = new URLSearchParams(searchParams);
                sp.set("page", String(next));
                setSearchParams(sp);
              }}
            >
              Anterior
            </button>
            <span className="muted">Página {page}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!hasMore || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                const sp = new URLSearchParams(searchParams);
                sp.set("page", String(next));
                setSearchParams(sp);
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
