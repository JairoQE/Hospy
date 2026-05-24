import { PropertyMap } from "./PropertyMap";

interface Props {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export function MapModal({ open, onClose, latitude, longitude, name, address }: Props) {
  if (!open) return null;

  return (
    <div className="map-modal-overlay" role="dialog" aria-modal aria-label="Mapa">
      <div className="map-modal">
        <div className="map-modal-header">
          <h2>{name}</h2>
          <p className="muted">{address}</p>
          <button type="button" className="map-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <PropertyMap
          latitude={latitude}
          longitude={longitude}
          name={name}
          address={address}
          scrollWheelZoom
          zoom={16}
          className="map-modal-map"
        />
        <a
          className="btn btn-primary map-modal-link"
          href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Cómo llegar en Google Maps
        </a>
      </div>
    </div>
  );
}
