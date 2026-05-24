import L from "leaflet";
import { useEffect, useRef } from "react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  className?: string;
  zoom?: number;
  scrollWheelZoom?: boolean;
}

export function PropertyMap({
  latitude,
  longitude,
  name,
  address,
  className = "",
  zoom = 15,
  scrollWheelZoom = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  useEffect(() => {
    if (!valid || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { scrollWheelZoom }).setView(
      [latitude, longitude],
      zoom,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const popup = address
      ? `<strong>${name}</strong><br>${address}`
      : `<strong>${name}</strong>`;
    L.marker([latitude, longitude], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(popup);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [valid, latitude, longitude, name, address, zoom, scrollWheelZoom]);

  if (!valid) {
    return (
      <div className={`property-map-wrap property-map-wrap--empty ${className}`}>
        <span className="muted">Ubicación no disponible</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`property-map-wrap ${className}`}
      aria-label={`Mapa de ${name}`}
    />
  );
}
