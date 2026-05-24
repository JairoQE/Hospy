import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { roundCoordinate } from "../utils/coordinates";

const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface LocationPickResult {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  searchHint?: string;
  onConfirm: (result: LocationPickResult) => void;
}

async function searchPlace(query: string): Promise<LocationPickResult | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name?: string;
    address?: { city?: string; town?: string; state?: string; country?: string };
  }[];
  const hit = data[0];
  if (!hit) return null;
  const addr = hit.address;
  return {
    latitude: roundCoordinate(hit.lat),
    longitude: roundCoordinate(hit.lon),
    address: hit.display_name?.split(",")[0],
    city: addr?.city ?? addr?.town,
    region: addr?.state,
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<LocationPickResult>> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    display_name?: string;
    address?: { road?: string; city?: string; town?: string; state?: string };
  };
  const a = data.address;
  return {
    address: a?.road ?? data.display_name?.split(",")[0],
    city: a?.city ?? a?.town,
    region: a?.state,
  };
}

export function LocationPickerModal({
  open,
  onClose,
  latitude,
  longitude,
  searchHint = "",
  onConfirm,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ lat: latitude, lng: longitude });
  const [query, setQuery] = useState(searchHint);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (open) {
      setPos({ lat: latitude, lng: longitude });
      setQuery(searchHint);
      setSearchError("");
    }
  }, [open, latitude, longitude, searchHint]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [pos.lat, pos.lng],
      15,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const marker = L.marker([pos.lat, pos.lng], { icon: pinIcon, draggable: true }).addTo(map);

    const setMarker = (lat: number, lng: number) => {
      setPos({ lat: roundCoordinate(lat), lng: roundCoordinate(lng) });
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
    };

    map.on("click", (e) => setMarker(e.latlng.lat, e.latlng.lng));
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      setPos({ lat: roundCoordinate(ll.lat), lng: roundCoordinate(ll.lng) });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount map when modal opens
  }, [open]);

  useEffect(() => {
    if (!open || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([pos.lat, pos.lng]);
    mapRef.current.panTo([pos.lat, pos.lng]);
  }, [pos.lat, pos.lng, open]);

  const handleSearch = async () => {
    setSearching(true);
    setSearchError("");
    try {
      const result = await searchPlace(query);
      if (!result) {
        setSearchError("No se encontró ese lugar. Prueba con ciudad + dirección.");
        return;
      }
      setPos({ lat: result.latitude, lng: result.longitude });
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    const extra = await reverseGeocode(pos.lat, pos.lng);
    onConfirm({
      latitude: roundCoordinate(pos.lat),
      longitude: roundCoordinate(pos.lng),
      ...extra,
    });
    onClose();
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`;

  if (!open) return null;

  return (
    <div className="map-modal-overlay location-picker-overlay" role="dialog" aria-modal>
      <div className="map-modal location-picker-modal">
        <div className="map-modal-header">
          <h2>Seleccionar ubicación</h2>
          <p className="muted">
            Busca como en Google Maps, haz clic en el mapa o arrastra el pin. Luego confirma.
          </p>
          <button type="button" className="map-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="location-search-row">
          <input
            type="text"
            placeholder="Ej. Av. Benavides 271, Miraflores, Lima"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          <button type="button" className="btn btn-primary" onClick={handleSearch} disabled={searching}>
            {searching ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {searchError && <p className="error-msg location-search-error">{searchError}</p>}

        <div ref={containerRef} className="location-picker-map" />

        <p className="location-coords muted">
          Latitud: <strong>{pos.lat.toFixed(6)}</strong> · Longitud:{" "}
          <strong>{pos.lng.toFixed(6)}</strong>
        </p>

        <div className="btn-row location-picker-actions">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            Abrir en Google Maps
          </a>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Usar esta ubicación
          </button>
        </div>
      </div>
    </div>
  );
}
