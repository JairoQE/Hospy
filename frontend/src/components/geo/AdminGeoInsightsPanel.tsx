import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminActivityMap,
  fetchAdminSecurityAlerts,
  resolveSecurityAlert,
  type ActivityMapPoint,
  type ActivityMapResponse,
  type SecurityAlertRow,
} from "../../api/geo";
import { formatDate } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import { AdminActivityMap } from "./AdminActivityMap";

function severityClass(severity: string) {
  if (severity === "high") return "admin-geo-alert--high";
  if (severity === "medium") return "admin-geo-alert--medium";
  return "admin-geo-alert--low";
}

function pointKey(p: ActivityMapPoint): string {
  return `${p.latitude}-${p.longitude}`;
}

function dotSize(count: number, maxCount: number): number {
  if (maxCount <= 0) return 12;
  const ratio = count / maxCount;
  return Math.round(12 + ratio * 22);
}

const EMPTY_MAP: ActivityMapResponse = {
  days: 7,
  points: [],
  total_events: 0,
  by_country: [],
  by_department: [],
  timeline: [],
};

export function AdminGeoInsightsPanel() {
  const [mapData, setMapData] = useState<ActivityMapResponse>(EMPTY_MAP);
  const [alerts, setAlerts] = useState<SecurityAlertRow[]>([]);
  const [unresolved, setUnresolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAdminActivityMap(7), fetchAdminSecurityAlerts(20)])
      .then(([map, sec]) => {
        setMapData(map);
        setAlerts(sec.alerts);
        setUnresolved(sec.unresolved_total);
      })
      .catch(() => {
        setMapData(EMPTY_MAP);
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sortedPoints = useMemo(
    () => [...mapData.points].sort((a, b) => b.count - a.count),
    [mapData.points],
  );

  const maxCount = useMemo(
    () => sortedPoints.reduce((max, p) => Math.max(max, p.count), 0),
    [sortedPoints],
  );

  const handleResolve = async (id: number) => {
    await resolveSecurityAlert(id);
    load();
  };

  const hasMapData =
    mapData.total_events > 0 ||
    mapData.by_country.length > 0 ||
    mapData.points.length > 0;

  return (
    <section className="admin-geo-insights" aria-label="Inteligencia ip.guide">
      <header className="admin-geo-insights-head">
        <div>
          <h2>Inteligencia ip.guide</h2>
          <p className="muted">
            Geolocalización aproximada, alertas de pagos y seguridad de cuentas
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <PrimeIcon name="pi-refresh" size={14} />
          Actualizar
        </button>
      </header>

      <div className="admin-geo-grid">
        <div className="admin-geo-map-card">
          <div className="admin-geo-map-card-head">
            <div>
              <h3>Mapa de actividad (7 días)</h3>
              {!loading && hasMapData && (
                <p className="admin-geo-map-meta">
                  <span className="admin-geo-stat-pill">
                    <PrimeIcon name="pi-map-marker" size={13} />
                    {mapData.total_events} eventos
                  </span>
                  <span className="admin-geo-stat-pill">
                    <PrimeIcon name="pi-globe" size={13} />
                    {mapData.by_country.length} países
                  </span>
                  {mapData.by_department.length > 0 && (
                    <span className="admin-geo-stat-pill">
                      <PrimeIcon name="pi-sitemap" size={13} />
                      {mapData.by_department.length} departamentos
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <p className="admin-geo-empty muted">Cargando mapa…</p>
          ) : !hasMapData ? (
            <p className="admin-geo-empty muted">
              Sin eventos geolocalizados aún. Aparecerán tras reservas, pagos o accesos auditados.
            </p>
          ) : (
            <>
              <AdminActivityMap data={mapData} />

              {sortedPoints.length > 0 && (
                <div className="admin-geo-legend">
                  <p className="admin-geo-legend-title">Ciudades con más actividad</p>
                  <ul className="admin-geo-legend-list">
                    {sortedPoints.slice(0, 6).map((p, index) => {
                      const key = pointKey(p);
                      const pct =
                        mapData.total_events > 0
                          ? (p.count / mapData.total_events) * 100
                          : 0;
                      const isActive = activeKey === key;
                      return (
                        <li key={`${key}-legend`}>
                          <button
                            type="button"
                            className={`admin-geo-legend-row${isActive ? " is-active" : ""}`}
                            onMouseEnter={() => setActiveKey(key)}
                            onMouseLeave={() => setActiveKey(null)}
                            onFocus={() => setActiveKey(key)}
                            onBlur={() => setActiveKey(null)}
                          >
                            <span className="admin-geo-legend-rank">{index + 1}</span>
                            <span
                              className="admin-geo-legend-dot"
                              style={{ width: dotSize(p.count, maxCount) * 0.55 }}
                              aria-hidden
                            />
                            <span className="admin-geo-legend-copy">
                              <strong>{p.city || "Sin ciudad"}</strong>
                              <span className="admin-geo-legend-sub">
                                {p.country_code}
                                {p.department ? ` · ${p.department}` : ""} · {p.count} evento
                                {p.count === 1 ? "" : "s"}
                              </span>
                            </span>
                            <span className="admin-geo-legend-pct">{Math.round(pct)}%</span>
                            <span className="admin-geo-legend-bar-wrap" aria-hidden>
                              <span
                                className="admin-geo-legend-bar"
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="admin-geo-alerts-card">
          <h3>
            Alertas de seguridad
            {unresolved > 0 && (
              <span className="admin-geo-alert-badge">{unresolved}</span>
            )}
          </h3>
          {loading ? (
            <p className="admin-geo-empty muted">Cargando alertas…</p>
          ) : alerts.length === 0 ? (
            <p className="admin-geo-empty muted">No hay alertas pendientes.</p>
          ) : (
            <ul className="admin-geo-alert-list">
              {alerts.map((a) => (
                <li key={a.id} className={`admin-geo-alert ${severityClass(a.severity)}`}>
                  <div>
                    <strong>{a.message}</strong>
                    <span className="muted admin-geo-alert-meta">
                      {formatDate(a.created_at)}
                      {a.ip_address ? ` · ${a.ip_address}` : ""}
                      {a.user_email ? ` · ${a.user_email}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleResolve(a.id)}
                  >
                    Resolver
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
