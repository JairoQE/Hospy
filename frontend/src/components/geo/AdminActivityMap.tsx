import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type {
  ActivityMapCountry,
  ActivityMapDepartment,
  ActivityMapPoint,
  ActivityMapResponse,
  ActivityMapTimelineDay,
} from "../../api/geo";
import {
  boundsForCountry,
  WORLD_BOUNDS,
} from "./activityMapBounds";
import { PrimeIcon } from "../PrimeIcon";

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

type MapView =
  | { level: "world" }
  | { level: "country"; code: string; name: string }
  | {
      level: "department";
      code: string;
      name: string;
      countryCode: string;
    }
  | {
      level: "cities";
      countryCode: string;
      department?: string;
      label: string;
    };

type Props = {
  data: ActivityMapResponse;
  className?: string;
};

function countryCodeFromFeature(feature: GeoJSON.Feature): string {
  const props = feature.properties ?? {};
  const raw =
    props.ISO_A2 ??
    props.iso_a2 ??
    props.ISO_A2_EH ??
    props.ADM0_A3 ??
    props.id ??
    "";
  return String(raw).toUpperCase();
}

function colorForRatio(ratio: number, empty = false): string {
  if (empty || ratio <= 0) return "#e5e7eb";
  const t = Math.min(1, Math.max(0, ratio));
  const r = Math.round(219 + (37 - 219) * t);
  const g = Math.round(234 + (99 - 234) * t);
  const b = Math.round(254 + (235 - 254) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function markerRadius(count: number, max: number): number {
  if (max <= 0) return 8;
  return Math.round(8 + (count / max) * 18);
}

function boundsFromPoints(
  rows: { latitude: number; longitude: number }[],
  pad = 0.12,
): L.LatLngBoundsExpression | null {
  if (!rows.length) return null;
  const lats = rows.map((r) => r.latitude);
  const lons = rows.map((r) => r.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat || 1;
  const lonSpan = maxLon - minLon || 1;
  return [
    [minLat - latSpan * pad, minLon - lonSpan * pad],
    [maxLat + latSpan * pad, maxLon + lonSpan * pad],
  ];
}

function ActivityTimeline({
  rows,
  total,
}: {
  rows: ActivityMapTimelineDay[];
  total: number;
}) {
  const max = useMemo(
    () => rows.reduce((acc, row) => Math.max(acc, row.count), 0),
    [rows],
  );

  if (!rows.length) return null;

  const width = 168;
  const height = 44;
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = rows.length > 1 ? innerW / (rows.length - 1) : innerW;

  const points = rows
    .map((row, index) => {
      const x = padX + index * step;
      const y = padY + innerH - (max > 0 ? (row.count / max) * innerH : 0);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${padX},${height - padY} ${points} ${padX + innerW},${height - padY}`;

  return (
    <div className="admin-activity-map-timeline" aria-hidden>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <polygon points={area} fill="rgba(59, 130, 246, 0.18)" />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="admin-activity-map-timeline-labels">
        <span>0</span>
        <span>{total}</span>
      </div>
    </div>
  );
}

export function AdminActivityMap({ data, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [view, setView] = useState<MapView>({ level: "world" });
  const [worldGeo, setWorldGeo] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  const [geoError, setGeoError] = useState(false);

  const countryByCode = useMemo(() => {
    const map = new Map<string, ActivityMapCountry>();
    for (const row of data.by_country) {
      map.set(row.country_code.toUpperCase(), row);
    }
    return map;
  }, [data.by_country]);

  const maxCountryCount = useMemo(
    () => data.by_country.reduce((max, row) => Math.max(max, row.count), 0),
    [data.by_country],
  );

  const maxDeptCount = useMemo(
    () => data.by_department.reduce((max, row) => Math.max(max, row.count), 0),
    [data.by_department],
  );

  const filteredPoints = useMemo(() => {
    if (view.level === "world") return [];
    if (view.level === "country") {
      return data.points.filter(
        (p) => p.country_code.toUpperCase() === view.code.toUpperCase(),
      );
    }
    if (view.level === "department") {
      return data.points.filter(
        (p) =>
          p.country_code.toUpperCase() === view.countryCode.toUpperCase() &&
          (p.department || "").toLowerCase() === view.name.toLowerCase(),
      );
    }
    if (view.department) {
      return data.points.filter(
        (p) =>
          p.country_code.toUpperCase() === view.countryCode.toUpperCase() &&
          (p.department || "").toLowerCase() === view.department!.toLowerCase(),
      );
    }
    return data.points.filter(
      (p) => p.country_code.toUpperCase() === view.countryCode.toUpperCase(),
    );
  }, [data.points, view]);

  const departmentsForCountry = useCallback(
    (code: string): ActivityMapDepartment[] =>
      data.by_department.filter(
        (row) => row.country_code.toUpperCase() === code.toUpperCase(),
      ),
    [data.by_department],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_GEOJSON_URL)
      .then((res) => res.json())
      .then((json: GeoJSON.FeatureCollection) => {
        if (!cancelled) setWorldGeo(json);
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: true,
    });
    map.fitBounds(WORLD_BOUNDS, { padding: [12, 12] });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  const flyToBounds = useCallback((bounds: L.LatLngBoundsExpression, maxZoom = 8) => {
    mapRef.current?.fitBounds(bounds, { padding: [24, 24], maxZoom });
  }, []);

  const renderWorldLayer = useCallback(() => {
    const group = layerGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (worldGeo && !geoError) {
      const geoLayer = L.geoJSON(worldGeo, {
        style: (feature) => {
          const code = countryCodeFromFeature(feature as GeoJSON.Feature);
          const row = countryByCode.get(code);
          const count = row?.count ?? 0;
          const ratio = maxCountryCount > 0 ? count / maxCountryCount : 0;
          return {
            fillColor: colorForRatio(ratio, count <= 0),
            fillOpacity: count > 0 ? 0.82 : 0.35,
            color: "#ffffff",
            weight: 0.6,
          };
        },
        onEachFeature: (feature, layer) => {
          const code = countryCodeFromFeature(feature);
          const row = countryByCode.get(code);
          if (!row?.count) return;

          const label = row.country || code;
          layer.bindTooltip(`${label}: ${row.count} eventos`, {
            sticky: true,
            direction: "top",
          });

          layer.on("click", () => {
            const bounds = boundsForCountry(code);
            setView({ level: "country", code, name: label });
            if (bounds) flyToBounds(bounds, code === "PE" ? 6 : 5);
            else flyToBounds([[row.latitude, row.longitude], [row.latitude, row.longitude]], 5);
          });
        },
      });
      group.addLayer(geoLayer);
    } else {
      for (const row of data.by_country) {
        const ratio = maxCountryCount > 0 ? row.count / maxCountryCount : 0;
        const radius = markerRadius(row.count, maxCountryCount) * 12000;
        const circle = L.circle([row.latitude, row.longitude], {
          radius,
          color: "#ffffff",
          weight: 1,
          fillColor: colorForRatio(ratio),
          fillOpacity: 0.75,
        });
        circle.bindTooltip(`${row.country}: ${row.count} eventos`);
        circle.on("click", () => {
          const bounds = boundsForCountry(row.country_code);
          setView({
            level: "country",
            code: row.country_code,
            name: row.country,
          });
          if (bounds) flyToBounds(bounds);
        });
        group.addLayer(circle);
      }
    }

    flyToBounds(WORLD_BOUNDS, 3);
  }, [
    countryByCode,
    data.by_country,
    flyToBounds,
    geoError,
    maxCountryCount,
    worldGeo,
  ]);

  const renderCountryLayer = useCallback(
    (country: { code: string; name: string }) => {
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();

      const depts = departmentsForCountry(country.code);
      if (depts.length > 0) {
        for (const dept of depts) {
          const ratio = maxDeptCount > 0 ? dept.count / maxDeptCount : 0;
          const marker = L.circleMarker([dept.latitude, dept.longitude], {
            radius: markerRadius(dept.count, maxDeptCount),
            color: "#ffffff",
            weight: 1.5,
            fillColor: colorForRatio(ratio),
            fillOpacity: 0.85,
          });
          marker.bindTooltip(`${dept.name}: ${dept.count} eventos`);
          marker.on("click", () => {
            setView({
              level: "department",
              code: dept.code,
              name: dept.name,
              countryCode: country.code,
            });
            const bounds = boundsFromPoints(
              data.points.filter(
                (p) =>
                  (p.department || "").toLowerCase() === dept.name.toLowerCase(),
              ),
            );
            if (bounds) flyToBounds(bounds, 9);
            else flyToBounds([[dept.latitude, dept.longitude], [dept.latitude, dept.longitude]], 8);
          });
          group.addLayer(marker);
        }
        return;
      }

      renderCityMarkers(
        group,
        data.points.filter(
          (p) => p.country_code.toUpperCase() === country.code.toUpperCase(),
        ),
        data.total_events,
        (point) => {
          setView({
            level: "cities",
            countryCode: country.code,
            label: point.city || country.name,
          });
          flyToBounds([[point.latitude, point.longitude], [point.latitude, point.longitude]], 11);
        },
      );

      const bounds =
        boundsFromPoints(
          data.points.filter(
            (p) => p.country_code.toUpperCase() === country.code.toUpperCase(),
          ),
        ) ?? boundsForCountry(country.code);
      if (bounds) flyToBounds(bounds, 7);
    },
    [data.points, data.total_events, departmentsForCountry, flyToBounds, maxDeptCount],
  );

  const renderDepartmentLayer = useCallback(
    (department: { name: string; countryCode: string }) => {
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();

      const points = data.points.filter(
        (p) =>
          p.country_code.toUpperCase() === department.countryCode.toUpperCase() &&
          (p.department || "").toLowerCase() === department.name.toLowerCase(),
      );

      renderCityMarkers(group, points, data.total_events, (point) => {
        setView({
          level: "cities",
          countryCode: department.countryCode,
          department: department.name,
          label: point.city || department.name,
        });
        flyToBounds([[point.latitude, point.longitude], [point.latitude, point.longitude]], 12);
      });

      const bounds = boundsFromPoints(points) ?? boundsForCountry(department.countryCode);
      if (bounds) flyToBounds(bounds, 9);
    },
    [data.points, data.total_events, flyToBounds],
  );

  const renderCitiesLayer = useCallback(
    (countryCode: string, department?: string) => {
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();

      const points = data.points.filter((p) => {
        if (p.country_code.toUpperCase() !== countryCode.toUpperCase()) return false;
        if (department) {
          return (p.department || "").toLowerCase() === department.toLowerCase();
        }
        return true;
      });

      renderCityMarkers(group, points, data.total_events);
      const bounds = boundsFromPoints(points);
      if (bounds) flyToBounds(bounds, 11);
    },
    [data.points, data.total_events, flyToBounds],
  );

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    if (view.level === "world") {
      renderWorldLayer();
      return;
    }
    if (view.level === "country") {
      renderCountryLayer(view);
      return;
    }
    if (view.level === "department") {
      renderDepartmentLayer(view);
      return;
    }
    renderCitiesLayer(view.countryCode, view.department);
  }, [
    view,
    renderWorldLayer,
    renderCountryLayer,
    renderDepartmentLayer,
    renderCitiesLayer,
    worldGeo,
    geoError,
  ]);

  const breadcrumb = useMemo(() => {
    const items: { label: string; view: MapView }[] = [
      { label: "Mundo", view: { level: "world" } },
    ];
    if (view.level === "country" || view.level === "department" || view.level === "cities") {
      const countryName =
        countryByCode.get(
          view.level === "country"
            ? view.code
            : view.level === "department"
              ? view.countryCode
              : view.countryCode,
        )?.country ??
        (view.level === "country" ? view.name : view.countryCode);
      const countryCode =
        view.level === "country" ? view.code : view.countryCode;
      items.push({
        label: countryName,
        view: { level: "country", code: countryCode, name: countryName },
      });
    }
    if (view.level === "department") {
      items.push({
        label: view.name,
        view: {
          level: "department",
          code: view.code,
          name: view.name,
          countryCode: view.countryCode,
        },
      });
    }
    if (view.level === "cities" && view.department) {
      items.push({
        label: view.department,
        view: {
          level: "cities",
          countryCode: view.countryCode,
          department: view.department,
          label: view.department,
        },
      });
    }
    return items;
  }, [countryByCode, view]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const hasData =
    data.by_country.length > 0 ||
    data.points.length > 0 ||
    data.total_events > 0;

  if (!hasData) return null;

  return (
    <div className={`admin-activity-map-wrap ${className}`.trim()}>
      <div className="admin-activity-map-toolbar">
        <nav className="admin-activity-map-breadcrumb" aria-label="Nivel del mapa">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="admin-activity-map-crumb">
              {index > 0 && <span className="admin-activity-map-crumb-sep">›</span>}
              <button
                type="button"
                className={
                  index === breadcrumb.length - 1
                    ? "admin-activity-map-crumb-btn is-current"
                    : "admin-activity-map-crumb-btn"
                }
                onClick={() => {
                  setView(item.view);
                  if (item.view.level === "world") flyToBounds(WORLD_BOUNDS, 3);
                }}
              >
                {item.label}
              </button>
            </span>
          ))}
        </nav>
        <p className="admin-activity-map-hint muted">
          Clic en un país, departamento o ciudad para acercar
        </p>
      </div>

      <div className="admin-activity-map-stage">
        <div ref={containerRef} className="admin-activity-map-leaflet" />

        <div className="admin-activity-map-zoom" aria-label="Zoom del mapa">
          <button type="button" onClick={zoomIn} aria-label="Acercar">
            +
          </button>
          <button type="button" onClick={zoomOut} aria-label="Alejar">
            −
          </button>
        </div>

        <ActivityTimeline rows={data.timeline} total={data.total_events} />

        <div className="admin-activity-map-info" title="Datos aproximados por IP">
          <PrimeIcon name="pi-info-circle" size={14} />
        </div>

        {filteredPoints.length > 0 && view.level !== "world" && (
          <div className="admin-activity-map-side-legend">
            <p>Zonas visibles ({filteredPoints.length})</p>
            <ul>
              {filteredPoints.slice(0, 5).map((p) => (
                <li key={`${p.latitude}-${p.longitude}`}>
                  <span>{p.city || "Sin ciudad"}</span>
                  <strong>{p.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function renderCityMarkers(
  group: L.LayerGroup,
  points: ActivityMapPoint[],
  totalEvents: number,
  onClick?: (point: ActivityMapPoint) => void,
) {
  const max = points.reduce((acc, p) => Math.max(acc, p.count), 0);
  for (const point of points) {
    const ratio = max > 0 ? point.count / max : 0;
    const marker = L.circleMarker([point.latitude, point.longitude], {
      radius: markerRadius(point.count, max),
      color: "#ffffff",
      weight: 1.5,
      fillColor: colorForRatio(ratio),
      fillOpacity: 0.9,
    });
    const pct =
      totalEvents > 0 ? Math.round((point.count / totalEvents) * 100) : 0;
    const actions = point.top_actions
      .slice(0, 2)
      .map((a) => `${a.action} (${a.count})`)
      .join(", ");
    marker.bindPopup(
      `<strong>${point.city || "Sin ciudad"}</strong><br/>` +
        `${point.country_code}${point.department ? ` · ${point.department}` : ""}<br/>` +
        `${point.count} eventos (${pct}%)` +
        (actions ? `<br/><span style="opacity:.75">${actions}</span>` : ""),
    );
    if (onClick) {
      marker.on("click", () => onClick(point));
    }
    group.addLayer(marker);
  }
}
