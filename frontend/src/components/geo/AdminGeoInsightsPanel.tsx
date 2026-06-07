import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminActivityMap,
  fetchAdminSecurityAlerts,
  resolveSecurityAlert,
  type ActivityMapPoint,
  type SecurityAlertRow,
} from "../../api/geo";
import { formatDate } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";

function severityClass(severity: string) {
  if (severity === "high") return "admin-geo-alert--high";
  if (severity === "medium") return "admin-geo-alert--medium";
  return "admin-geo-alert--low";
}

export function AdminGeoInsightsPanel() {
  const [mapPoints, setMapPoints] = useState<ActivityMapPoint[]>([]);
  const [mapTotal, setMapTotal] = useState(0);
  const [alerts, setAlerts] = useState<SecurityAlertRow[]>([]);
  const [unresolved, setUnresolved] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAdminActivityMap(7), fetchAdminSecurityAlerts(20)])
      .then(([map, sec]) => {
        setMapPoints(map.points);
        setMapTotal(map.total_events);
        setAlerts(sec.alerts);
        setUnresolved(sec.unresolved_total);
      })
      .catch(() => {
        setMapPoints([]);
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const bounds = useMemo(() => {
    if (!mapPoints.length) return null;
    const lats = mapPoints.map((p) => p.latitude);
    const lons = mapPoints.map((p) => p.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
  }, [mapPoints]);

  const project = (p: ActivityMapPoint) => {
    if (!bounds) return { x: 50, y: 50 };
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    const lonSpan = bounds.maxLon - bounds.minLon || 1;
    const x = 8 + ((p.longitude - bounds.minLon) / lonSpan) * 84;
    const y = 92 - ((p.latitude - bounds.minLat) / latSpan) * 84;
    return { x, y };
  };

  const handleResolve = async (id: number) => {
    await resolveSecurityAlert(id);
    load();
  };

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
          <h3>Mapa de actividad (7 días)</h3>
          {loading ? (
            <p className="muted">Cargando mapa…</p>
          ) : mapPoints.length === 0 ? (
            <p className="muted">
              Sin eventos geolocalizados aún. Aparecerán tras reservas, pagos o accesos auditados.
            </p>
          ) : (
            <>
              <p className="admin-geo-map-meta muted">{mapTotal} eventos · {mapPoints.length} zonas</p>
              <div className="admin-geo-map-canvas" role="img" aria-label="Mapa de actividad">
                {mapPoints.map((p) => {
                  const { x, y } = project(p);
                  const size = Math.min(28, 8 + p.count * 2);
                  return (
                    <span
                      key={`${p.latitude}-${p.longitude}`}
                      className="admin-geo-map-dot"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: size,
                        height: size,
                      }}
                      title={`${p.city || "Zona"} · ${p.count} eventos`}
                    />
                  );
                })}
              </div>
              <ul className="admin-geo-map-legend">
                {mapPoints.slice(0, 6).map((p) => (
                  <li key={`${p.latitude}-${p.longitude}-legend`}>
                    <strong>{p.city || "Sin ciudad"}</strong> ({p.country_code}) · {p.count}
                  </li>
                ))}
              </ul>
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
            <p className="muted">Cargando alertas…</p>
          ) : alerts.length === 0 ? (
            <p className="muted">No hay alertas pendientes.</p>
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
