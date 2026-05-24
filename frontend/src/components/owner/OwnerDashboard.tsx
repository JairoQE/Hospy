import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccommodationListItem, Booking, Review } from "../../api/types";
import { formatDate } from "../../utils/format";
import {
  buildDashboardData,
  type DashboardPeriod,
  type KpiMetric,
  type TrendDir,
} from "../../utils/ownerDashboardData";
import { PrimeIcon } from "../PrimeIcon";
import { StatusBadge } from "../StatusBadge";
import "../../styles/owner-dashboard.css";

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Año" },
];

type Props = {
  properties: AccommodationListItem[];
  bookings: Booking[];
  reviews: Review[];
  unreadMessages: number;
  onViewReservations: () => void;
  onViewConsultas: () => void;
};

function TrendBadge({ dir, label }: { dir: TrendDir; label: string }) {
  const icon =
    dir === "up" ? "pi-arrow-up" : dir === "down" ? "pi-arrow-down" : "pi-minus";
  return (
    <span className={`owner-kpi-trend owner-kpi-trend--${dir}`}>
      <PrimeIcon name={icon} size={12} />
      {label}
    </span>
  );
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <article className="owner-kpi-card" aria-label={metric.label}>
      <div className="owner-kpi-card-top">
        <span className="owner-kpi-icon" aria-hidden>
          <PrimeIcon name={metric.icon} size={22} />
        </span>
        <TrendBadge dir={metric.trend} label={metric.trendLabel} />
      </div>
      <p className="owner-kpi-value">{metric.value}</p>
      <p className="owner-kpi-label">{metric.label}</p>
      <p className="owner-kpi-sublabel">{metric.sublabel}</p>
    </article>
  );
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="owner-review-stars" aria-label={`${rating} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <PrimeIcon
          key={i}
          name={i < full ? "pi-star-fill" : "pi-star"}
          size={14}
        />
      ))}
    </span>
  );
}

export function OwnerDashboard({
  properties,
  bookings,
  reviews,
  unreadMessages,
  onViewReservations,
  onViewConsultas,
}: Props) {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [propertyId, setPropertyId] = useState<number | "all">("all");

  const data = useMemo(
    () =>
      buildDashboardData({
        period,
        propertyId,
        properties,
        bookings,
        reviews,
        unreadMessages,
      }),
    [period, propertyId, properties, bookings, reviews, unreadMessages],
  );

  const showPropertyFilter = properties.length > 1;

  return (
    <div className="owner-dashboard">
      <header className="owner-dashboard-header">
        <div>
          <h2 className="owner-dashboard-title">Resumen de rendimiento</h2>
          <p className="owner-dashboard-sub">
            {data.propertyLabel} · comparado con el período anterior
          </p>
        </div>
        <div className="owner-dashboard-filters">
          {showPropertyFilter ? (
            <label className="owner-dashboard-select-wrap">
              <span className="owner-dashboard-select-label">Hospedaje</span>
              <select
                value={propertyId === "all" ? "all" : String(propertyId)}
                onChange={(e) =>
                  setPropertyId(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  )
                }
                className="owner-dashboard-select"
                aria-label="Filtrar por hospedaje"
              >
                <option value="all">Todos los hospedajes</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : properties.length === 1 ? (
            <p className="owner-dashboard-single-property">
              <PrimeIcon name="pi-home" size={16} />
              {properties[0].name}
            </p>
          ) : null}

          <div
            className="owner-dashboard-period"
            role="group"
            aria-label="Período de estadísticas"
          >
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`owner-dashboard-period-btn${period === p.id ? " is-active" : ""}`}
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!data.hasEnoughData && (
        <div className="owner-dashboard-empty" role="status">
          <PrimeIcon name="pi-chart-line" className="owner-dashboard-empty-icon" size={40} />
          <h3>Aún no hay suficientes datos</h3>
          <p>
            Completa más reservas para ver estadísticas detalladas. Los indicadores se
            actualizarán automáticamente.
          </p>
        </div>
      )}

      <section className="owner-kpi-grid" aria-label="Indicadores principales">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} metric={kpi} />
        ))}
      </section>

      <div className="owner-dashboard-main-grid">
        <section
          className="owner-dash-card owner-dash-card--chart"
          aria-label="Ocupación e ingresos diarios"
        >
          <h3 className="owner-dash-card-title">Ocupación e ingresos diarios</h3>
          <div
            className="owner-chart-wrap"
            role="img"
            aria-label="Gráfico de líneas de ocupación e ingresos"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dailySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v) => `S/${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                  }}
                  formatter={(value, name) => {
                    const n = Number(value);
                    if (name === "Ingresos") return [`S/ ${n.toLocaleString("es-PE")}`, name];
                    return [`${n}%`, name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="occupancy"
                  name="Ocupación"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <aside className="owner-dashboard-side">
          <section className="owner-dash-card" aria-label="Reservas por canal">
            <h3 className="owner-dash-card-title">Reservas por canal</h3>
            <p className="owner-dash-card-note">Estimación basada en reservas confirmadas</p>
            {data.channels.length === 0 ? (
              <p className="muted owner-dash-empty-inline">Sin reservas en el período</p>
            ) : (
              <div className="owner-donut-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.channels}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {data.channels.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as { percent: number; name: string };
                        return [`${value} (${payload?.percent ?? 0}%)`, payload?.name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="owner-channel-legend">
                  {data.channels.map((c) => (
                    <li key={c.name}>
                      <span className="owner-channel-dot" style={{ background: c.color }} />
                      {c.name} · {c.count} ({c.percent}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {data.alerts.length > 0 && (
            <section className="owner-dash-card owner-dash-alerts" aria-label="Alertas">
              <h3 className="owner-dash-card-title">Alertas y tareas</h3>
              <ul className="owner-alert-list">
                {data.alerts.map((a) => (
                  <li key={a.id} className={`owner-alert-item owner-alert-item--${a.tone}`}>
                    <PrimeIcon name={a.icon} size={18} />
                    <span>{a.message}</span>
                  </li>
                ))}
              </ul>
              {unreadMessages > 0 && (
                <button type="button" className="owner-dash-link-btn" onClick={onViewConsultas}>
                  Ir a consultas
                  <PrimeIcon name="pi-arrow-right" size={14} />
                </button>
              )}
            </section>
          )}
        </aside>
      </div>

      <div className="owner-dashboard-bottom-grid">
        <section className="owner-dash-card" aria-label="Próximas reservas">
          <div className="owner-dash-card-head">
            <h3 className="owner-dash-card-title">Próximas reservas</h3>
            <button type="button" className="owner-dash-link-btn" onClick={onViewReservations}>
              Ver todas
              <PrimeIcon name="pi-arrow-right" size={14} />
            </button>
          </div>
          {data.upcomingBookings.length === 0 ? (
            <p className="muted owner-dash-empty-inline">No hay check-ins próximos</p>
          ) : (
            <ul className="owner-upcoming-list">
              {data.upcomingBookings.map((b) => (
                <li key={b.id} className="owner-upcoming-item">
                  <div>
                    <strong>{b.huesped.nombre}</strong>
                    <span className="owner-upcoming-meta">
                      {formatDate(b.check_in)} · {b.hospedaje}
                    </span>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="owner-dash-card" aria-label="Reseñas recientes">
          <h3 className="owner-dash-card-title">Reseñas recientes</h3>
          {data.recentReviews.length === 0 ? (
            <p className="muted owner-dash-empty-inline">
              Aún no hay reseñas publicadas en tus hospedajes.
            </p>
          ) : (
            <ul className="owner-review-list">
              {data.recentReviews.map((r) => (
                <li key={r.id} className="owner-review-item">
                  <div className="owner-review-head">
                    <StarRow rating={r.rating} />
                    <span className="owner-review-date">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="owner-review-author">{r.autor_nombre}</p>
                  <p className="owner-review-text">
                    {r.comment.length > 120 ? `${r.comment.slice(0, 120)}…` : r.comment}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
