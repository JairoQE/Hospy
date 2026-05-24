import type { GeolocationStatus } from "../../hooks/useGeolocation";
import { IconMapPin, IconSpinner } from "../icons";

type Props = {
  status: GeolocationStatus;
  onActivate: () => void;
  onSkip: () => void;
};

export function GeoLocationBanner({ status, onActivate, onSkip }: Props) {
  if (status !== "prompt" && status !== "loading") return null;

  return (
    <aside className="geo-banner fade-in" aria-label="Sugerencia de ubicación">
      <span className="geo-banner-icon" aria-hidden>
        <IconMapPin size={28} />
      </span>
      <p className="geo-banner-text">
        <strong>¿Explorar cerca de ti?</strong>
        <span className="geo-banner-sub">
          Activa tu ubicación para ver hoteles, hostales y hospedajes en tu zona.
        </span>
      </p>
      <div className="geo-banner-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onActivate}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <IconSpinner size={18} /> Obteniendo…
            </>
          ) : (
            "Activar ubicación"
          )}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onSkip}>
          Omitir
        </button>
      </div>
    </aside>
  );
}
