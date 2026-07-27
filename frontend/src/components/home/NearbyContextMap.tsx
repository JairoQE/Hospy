import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { NearbyExploreItem } from "../../api/nearby";
import type { AccommodationListItem, FeaturedSearchItem } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

export type MapMarkerKind = "focus" | "stay" | "restaurant" | "place";

type MapPoint = {
  kind: MapMarkerKind;
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
};

type Props = {
  focus: FeaturedSearchItem;
  stays: AccommodationListItem[];
  restaurants: NearbyExploreItem[];
  places: NearbyExploreItem[];
  className?: string;
};

const COLORS: Record<MapMarkerKind, string> = {
  focus: "#2563eb",
  stay: "#0f766e",
  restaurant: "#ea580c",
  place: "#16a34a",
};

const ICONS: Record<MapMarkerKind, string> = {
  focus: "★",
  stay: "⌂",
  restaurant: "🍴",
  place: "⛰",
};

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeIcon(kind: MapMarkerKind): L.DivIcon {
  const color = COLORS[kind];
  const glyph = ICONS[kind];
  return L.divIcon({
    className: "nearby-map-marker",
    html: `<span class="nearby-map-marker-pin nearby-map-marker-pin--${kind}" style="--pin:${color}"><span class="nearby-map-marker-glyph">${glyph}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -28],
  });
}

function collectPoints(
  focus: FeaturedSearchItem,
  stays: AccommodationListItem[],
  restaurants: NearbyExploreItem[],
  places: NearbyExploreItem[],
): MapPoint[] {
  const points: MapPoint[] = [];
  const flat = toNum(focus.search.lat);
  const flng = toNum(focus.search.lng);
  if (flat != null && flng != null) {
    points.push({
      kind: "focus",
      id: `focus-${focus.slug}`,
      name: focus.name,
      lat: flat,
      lng: flng,
      subtitle: focus.subtitle,
    });
  }

  for (const stay of stays) {
    const lat = toNum(stay.latitude);
    const lng = toNum(stay.longitude);
    if (lat == null || lng == null) continue;
    points.push({
      kind: "stay",
      id: `stay-${stay.id}`,
      name: stay.name,
      lat,
      lng,
      subtitle: stay.city,
    });
  }

  for (const row of restaurants) {
    const lat = toNum(row.latitude);
    const lng = toNum(row.longitude);
    if (lat == null || lng == null) continue;
    points.push({
      kind: "restaurant",
      id: `rest-${row.id ?? row.name}`,
      name: row.name,
      lat,
      lng,
      subtitle: row.subtitle || row.address,
    });
  }

  for (const row of places) {
    const lat = toNum(row.latitude);
    const lng = toNum(row.longitude);
    if (lat == null || lng == null) continue;
    points.push({
      kind: "place",
      id: `place-${row.id ?? row.slug ?? row.name}`,
      name: row.name,
      lat,
      lng,
      subtitle: row.subtitle || row.address,
    });
  }

  return points;
}

export function NearbyContextMap({
  focus,
  stays,
  restaurants,
  places,
  className = "",
}: Props) {
  const { t } = useLocaleCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const points = useMemo(
    () => collectPoints(focus, stays, restaurants, places),
    [focus, stays, restaurants, places],
  );

  const focusLat = toNum(focus.search.lat);
  const focusLng = toNum(focus.search.lng);

  useEffect(() => {
    if (!containerRef.current || focusLat == null || focusLng == null) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([focusLat, focusLng], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    const latLngs: L.LatLngExpression[] = [];

    for (const point of points) {
      const marker = L.marker([point.lat, point.lng], {
        icon: makeIcon(point.kind),
        title: point.name,
      });
      const kindLabel =
        point.kind === "focus"
          ? focus.kind === "event"
            ? t("home.featuredTabEvents")
            : focus.kind === "restaurant"
              ? t("home.featuredTabRestaurants")
              : t("home.featuredTabPlaces")
          : point.kind === "stay"
            ? t("home.nearbyMapStay")
            : point.kind === "restaurant"
              ? t("home.featuredTabRestaurants")
              : t("home.featuredTabPlaces");
      marker.bindPopup(
        `<div class="nearby-map-popup"><strong>${point.name}</strong><br/><span>${kindLabel}</span>${
          point.subtitle ? `<br/><span>${point.subtitle}</span>` : ""
        }</div>`,
      );
      marker.addTo(layer);
      latLngs.push([point.lat, point.lng]);
    }

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36], maxZoom: 15 });
    }

    mapRef.current = map;
    const resize = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
    };
  }, [focus.kind, focusLat, focusLng, points, t]);

  if (focusLat == null || focusLng == null) {
    return (
      <div className={`nearby-context-map nearby-context-map--empty ${className}`}>
        <p className="muted">{t("detail.mapUnavailable")}</p>
      </div>
    );
  }

  return (
    <div className={`nearby-context-map ${className}`}>
      <div
        ref={containerRef}
        className="nearby-context-map-canvas"
        aria-label={t("home.nearbyMapLabel")}
      />
      <ul className="nearby-context-map-legend" aria-label={t("home.nearbyMapLegend")}>
        <li>
          <span className="nearby-map-legend-dot" style={{ background: COLORS.focus }} />
          {focus.kind === "event"
            ? t("home.featuredTabEvents")
            : focus.kind === "restaurant"
              ? t("home.featuredTabRestaurants")
              : t("home.featuredTabPlaces")}
        </li>
        <li>
          <span className="nearby-map-legend-dot" style={{ background: COLORS.stay }} />
          {t("home.nearbyMapStay")}
        </li>
        <li>
          <span className="nearby-map-legend-dot" style={{ background: COLORS.restaurant }} />
          {t("home.featuredTabRestaurants")}
        </li>
        <li>
          <span className="nearby-map-legend-dot" style={{ background: COLORS.place }} />
          {t("home.featuredTabPlaces")}
        </li>
      </ul>
    </div>
  );
}
