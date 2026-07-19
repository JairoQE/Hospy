import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { fetchTouristPlace, type ConectaTingoPlace } from "../api/nearby";
import { PrimeIcon } from "../components/PrimeIcon";
import { resolveMediaUrl } from "../utils/media";
import "../styles/events-page.css";

export function TouristPlaceDetailPage() {
  const { slug = "" } = useParams();
  const [item, setItem] = useState<ConectaTingoPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchTouristPlace(slug);
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) {
          setItem(null);
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar el lugar turístico",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const imageUrl = resolveMediaUrl(item?.image_url);
  const nearbyHotelsHref =
    item?.latitude != null && item?.longitude != null
      ? `/?lat=${item.latitude}&lng=${item.longitude}&radio_km=25&label=${encodeURIComponent(item.name)}`
      : "/";

  return (
    <div className="events-page events-page--detail">
      <p>
        <Link to="/" className="events-page-back">
          <PrimeIcon name="pi-arrow-left" /> Volver al inicio
        </Link>
      </p>

      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="events-page-error">{error}</p> : null}

      {item ? (
        <article className="events-page-detail">
          {imageUrl ? (
            <div
              className="events-page-card-cover"
              style={{
                backgroundImage: `url(${imageUrl})`,
                borderRadius: 14,
                marginBottom: "1rem",
                height: 220,
              }}
            />
          ) : null}
          <p className="events-page-kicker">Conecta Tingo</p>
          <h1>{item.name}</h1>
          {item.zone ? <p className="muted">{item.zone}</p> : null}
          <ul className="events-page-facts">
            {item.interest_level != null ? (
              <li>
                <strong>Interés</strong> {item.interest_level}/10
              </li>
            ) : null}
            {item.entry_price ? (
              <li>
                <strong>Entrada</strong> {item.entry_price}
              </li>
            ) : null}
            {item.latitude != null && item.longitude != null ? (
              <li>
                <strong>Ubicación</strong> {item.latitude}, {item.longitude}
              </li>
            ) : null}
          </ul>
          <div className="events-page-actions">
            {item.latitude != null && item.longitude != null ? (
              <a
                className="btn btn-outline"
                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Cómo llegar
              </a>
            ) : null}
            {item.external_url ? (
              <a
                className="btn btn-outline"
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en Conecta Tingo
              </a>
            ) : null}
            <Link to={nearbyHotelsHref} className="btn btn-primary">
              Ver hospedajes cercanos
            </Link>
          </div>
        </article>
      ) : null}
    </div>
  );
}
