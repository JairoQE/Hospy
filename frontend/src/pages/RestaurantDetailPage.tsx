import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  fetchRestaurant,
  type RestoPointRestaurant,
} from "../api/restopoint";
import { PrimeIcon } from "../components/PrimeIcon";
import "../styles/events-page.css";

export function RestaurantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<RestoPointRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchRestaurant(id);
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) {
          setItem(null);
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar el restaurante",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const goNearbyHotels = () => {
    if (item?.latitude == null || item?.longitude == null) return;
    const q = new URLSearchParams({
      lat: String(item.latitude),
      lng: String(item.longitude),
      radio_km: "25",
      label: item.name,
    });
    navigate(`/?${q.toString()}#resultados`);
  };

  return (
    <div className="events-page events-page--detail">
      <p>
        <Link to="/restaurantes" className="events-page-back">
          <PrimeIcon name="pi-arrow-left" /> Volver a restaurantes
        </Link>
      </p>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="events-page-error">{error}</p> : null}

      {item ? (
        <article className="events-page-detail">
          <p className="events-page-kicker">RestoPoint</p>
          <h1>{item.name}</h1>
          <p className="muted">
            {[item.district, item.city, item.region].filter(Boolean).join(" · ")}
          </p>
          {item.address ? <p>{item.address}</p> : null}
          <ul className="events-page-facts">
            {item.avg_rating != null ? (
              <li>
                <strong>Rating</strong> ★ {item.avg_rating}
              </li>
            ) : null}
            {item.total_capacity != null ? (
              <li>
                <strong>Capacidad</strong> {item.total_capacity}
              </li>
            ) : null}
            {item.latitude != null && item.longitude != null ? (
              <li>
                <strong>Ubicación</strong> {item.latitude}, {item.longitude}
              </li>
            ) : null}
          </ul>
          <div className="events-page-actions">
            {item.maps_url ? (
              <a
                className="btn btn-outline"
                href={item.maps_url}
                target="_blank"
                rel="noreferrer"
              >
                Cómo llegar
              </a>
            ) : null}
            {item.latitude != null && item.longitude != null ? (
              <button type="button" className="btn btn-primary" onClick={goNearbyHotels}>
                Ver hospedajes cercanos
              </button>
            ) : null}
          </div>
        </article>
      ) : null}
    </div>
  );
}
