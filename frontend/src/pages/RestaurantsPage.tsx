import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  fetchRestaurants,
  type RestoPointRestaurant,
} from "../api/restopoint";
import { PrimeIcon } from "../components/PrimeIcon";
import "../styles/events-page.css";

export function RestaurantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<RestoPointRestaurant[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const page = Number(searchParams.get("page") || "0") || 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchRestaurants({ page, size: 12 });
      setItems(res.restaurants || []);
      setCount(res.count ?? res.restaurants?.length ?? 0);
    } catch (e) {
      setItems([]);
      setCount(0);
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudieron cargar los restaurantes de RestoPoint",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * 12 < count;

  return (
    <div className="events-page">
      <header className="events-page-hero">
        <p className="events-page-kicker">RestoPoint</p>
        <h1>Restaurantes</h1>
        <p className="muted">
          Catálogo externo con ubicación real. Elige uno para ver hospedajes
          cercanos en el inicio.
        </p>
      </header>

      {error ? <p className="events-page-error">{error}</p> : null}

      {loading ? (
        <p className="muted">Cargando restaurantes…</p>
      ) : items.length === 0 ? (
        <p className="muted">No hay restaurantes disponibles por ahora.</p>
      ) : (
        <ul className="events-page-grid">
          {items.map((r) => (
            <li key={r.id}>
              <Link to={`/restaurantes/${r.id}`} className="events-page-card">
                {r.cover_image_url || r.image_url ? (
                  <div
                    className="events-page-card-cover"
                    style={{
                      backgroundImage: `url(${r.cover_image_url || r.image_url})`,
                    }}
                  />
                ) : null}
                <h2>{r.name}</h2>
                <p className="muted">
                  {[r.district, r.city, r.region].filter(Boolean).join(" · ")}
                </p>
                {r.address ? <p>{r.address}</p> : null}
                <p className="events-page-meta">
                  {r.avg_rating != null ? `★ ${r.avg_rating}` : "Sin rating"}
                  {r.total_capacity != null
                    ? ` · Capacidad ${r.total_capacity}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="events-page-pager">
        <button
          type="button"
          className="btn btn-outline"
          disabled={!hasPrev || loading}
          onClick={() => setSearchParams({ page: String(page - 1) })}
        >
          <PrimeIcon name="pi-chevron-left" /> Anterior
        </button>
        <span className="muted">
          Página {page + 1} · {count} total
        </span>
        <button
          type="button"
          className="btn btn-outline"
          disabled={!hasNext || loading}
          onClick={() => setSearchParams({ page: String(page + 1) })}
        >
          Siguiente <PrimeIcon name="pi-chevron-right" />
        </button>
      </div>
    </div>
  );
}
