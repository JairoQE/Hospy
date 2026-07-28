import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { NearbyExploreItem } from "../api/nearby";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import "../styles/home.css";

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export type NearbyMapKind = "restaurant" | "place" | "event";

type NearbyMapPoint = {
  kind: NearbyMapKind;
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
};

interface Props {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  className?: string;
  zoom?: number;
  scrollWheelZoom?: boolean;
  /** POIs cercanos (restaurantes, lugares, eventos) */
  nearbyRestaurants?: NearbyExploreItem[];
  nearbyPlaces?: NearbyExploreItem[];
  nearbyEvents?: NearbyExploreItem[];
  showNearbyLegend?: boolean;
}

const COLORS: Record<NearbyMapKind | "stay", string> = {
  stay: "#0f766e",
  restaurant: "#ea580c",
  place: "#16a34a",
  event: "#2563eb",
};

const GLYPHS: Record<NearbyMapKind | "stay", string> = {
  stay: "⌂",
  restaurant: "🍴",
  place: "⛰",
  event: "★",
};

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeNearbyIcon(kind: NearbyMapKind | "stay"): L.DivIcon {
  const color = COLORS[kind];
  const glyph = GLYPHS[kind];
  return L.divIcon({
    className: "nearby-map-marker",
    html: `<span class="nearby-map-marker-pin nearby-map-marker-pin--${kind}" style="--pin:${color}"><span class="nearby-map-marker-glyph">${glyph}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -28],
  });
}

function collectNearbyPoints(
  restaurants: NearbyExploreItem[],
  places: NearbyExploreItem[],
  events: NearbyExploreItem[],
): NearbyMapPoint[] {
  const points: NearbyMapPoint[] = [];
  const push = (kind: NearbyMapKind, item: NearbyExploreItem, index: number) => {
    const lat = toNum(item.latitude);
    const lng = toNum(item.longitude);
    if (lat == null || lng == null) return;
    points.push({
      kind,
      id: `${kind}-${item.id ?? item.slug ?? item.name}-${index}`,
      name: item.name,
      lat,
      lng,
      subtitle:
        item.distance_km != null
          ? `${item.distance_km} km${item.subtitle ? ` · ${item.subtitle}` : ""}`
          : item.subtitle || item.address,
    });
  };

  restaurants.forEach((item, i) => push("restaurant", item, i));
  places.forEach((item, i) => push("place", item, i));
  events.forEach((item, i) => push("event", item, i));
  return points;
}

export function PropertyMap({
  latitude,
  longitude,
  name,
  address,
  className = "",
  zoom = 15,
  scrollWheelZoom = false,
  nearbyRestaurants = [],
  nearbyPlaces = [],
  nearbyEvents = [],
  showNearbyLegend = false,
}: Props) {
  const { t, tVars } = useLocaleCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const nearbyPoints = useMemo(
    () => collectNearbyPoints(nearbyRestaurants, nearbyPlaces, nearbyEvents),
    [nearbyRestaurants, nearbyPlaces, nearbyEvents],
  );

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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    }).addTo(map);

    const popup = address
      ? `<strong>${name}</strong><br>${address}`
      : `<strong>${name}</strong>`;
    L.marker([latitude, longitude], {
      icon: nearbyPoints.length > 0 ? makeNearbyIcon("stay") : defaultIcon,
      title: name,
      zIndexOffset: 400,
    })
      .addTo(map)
      .bindPopup(popup);

    const latLngs: L.LatLngExpression[] = [[latitude, longitude]];
    const kindLabel = (kind: NearbyMapKind) =>
      kind === "restaurant"
        ? t("detail.nearbyRestaurants")
        : kind === "place"
          ? t("detail.nearbyPlaces")
          : t("detail.nearbyEvents");

    for (const point of nearbyPoints) {
      const marker = L.marker([point.lat, point.lng], {
        icon: makeNearbyIcon(point.kind),
        title: point.name,
      });
      marker.bindPopup(
        `<div class="nearby-map-popup"><strong>${point.name}</strong><br/><span>${kindLabel(
          point.kind,
        )}</span>${
          point.subtitle ? `<br/><span>${point.subtitle}</span>` : ""
        }</div>`,
      );
      marker.addTo(map);
      latLngs.push([point.lat, point.lng]);
    }

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28], maxZoom: 15 });
    }

    mapRef.current = map;
    const resize = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
    };
  }, [
    valid,
    latitude,
    longitude,
    name,
    address,
    zoom,
    scrollWheelZoom,
    nearbyPoints,
    t,
  ]);

  if (!valid) {
    return (
      <div className={`property-map-wrap property-map-wrap--empty ${className}`}>
        <span className="muted">{t("detail.mapUnavailable")}</span>
      </div>
    );
  }

  return (
    <div className="property-map-with-legend">
      <div
        ref={containerRef}
        className={`property-map-wrap ${className}`.trim()}
        aria-label={tVars("detail.mapOf", { name })}
      />
      {showNearbyLegend && nearbyPoints.length > 0 ? (
        <ul className="property-map-legend" aria-label={t("detail.nearbyTitle")}>
          <li>
            <span className="property-map-legend-dot" style={{ background: COLORS.stay }} />
            {t("detail.location")}
          </li>
          {nearbyRestaurants.some((r) => toNum(r.latitude) != null) ? (
            <li>
              <span
                className="property-map-legend-dot"
                style={{ background: COLORS.restaurant }}
              />
              {t("detail.nearbyRestaurants")}
            </li>
          ) : null}
          {nearbyPlaces.some((r) => toNum(r.latitude) != null) ? (
            <li>
              <span className="property-map-legend-dot" style={{ background: COLORS.place }} />
              {t("detail.nearbyPlaces")}
            </li>
          ) : null}
          {nearbyEvents.some((r) => toNum(r.latitude) != null) ? (
            <li>
              <span className="property-map-legend-dot" style={{ background: COLORS.event }} />
              {t("detail.nearbyEvents")}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
