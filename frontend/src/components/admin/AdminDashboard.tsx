import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
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
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "../../api/types";
import { formatDate, formatMoney } from "../../utils/format";
import {
  ADMIN_REGIONS,
  type AdminDashboardSnapshot,
  type AdminKpi,
  type AdminPeriod,
  type AdminPropertyFilter,
  type TrendDir,
  buildAdminDashboard,
  exportDashboardCsv,
} from "../../utils/adminDashboardData";
import { PrimeIcon } from "../PrimeIcon";
import { StatusBadge } from "../StatusBadge";

const PERIODS: { id: AdminPeriod; label: string }[] = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Año" },
];

const PROPERTY_FILTERS: { id: AdminPropertyFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "pending", label: "Pendientes" },
  { id: "suspended", label: "Suspendidos" },
];

type Props = {
  bookings: Booking[];
  accommodations: AccommodationListItem[];
  pendingAccommodations: AccommodationDetail[];
  pendingOwners: User[];
  pendingReports: number;
  reviews: Review[];
  approvedCount: number;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
};

function TrendBadge({ dir, label }: { dir: TrendDir; label: string }) {
  const icon =
    dir === "up" ? "pi-arrow-up" : dir === "down" ? "pi-arrow-down" : "pi-minus";
  return (
    <span className={`admin-kpi-trend admin-kpi-trend--${dir}`}>
      <PrimeIcon name={icon} size={12} />
      {label}
    </span>
  );
}

function KpiCard({ kpi }: { kpi: AdminKpi }) {
  return (
    <article className="admin-kpi-card" title={kpi.tooltip} aria-label={kpi.label}>
      <div className="admin-kpi-card-top">
        <span className="admin-kpi-icon">
          <PrimeIcon name={kpi.icon} size={22} />
        </span>
        <TrendBadge dir={kpi.trend} label={kpi.trendLabel} />
      </div>
      <p className="admin-kpi-value">{kpi.value}</p>
      <p className="admin-kpi-label">{kpi.label}</p>
      <p className="admin-kpi-sublabel">{kpi.sublabel}</p>
    </article>
  );
}

export function AdminDashboard({
  bookings,
  accommodations,
  pendingAccommodations,
  pendingOwners,
  pendingReports,
  reviews,
  approvedCount,
  selectedRegion,
  onRegionChange,
}: Props) {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [propertyFilter, setPropertyFilter] = useState<AdminPropertyFilter>("all");

  const data: AdminDashboardSnapshot = useMemo(
    () =>
      buildAdminDashboard({
        period,
        region: selectedRegion,
        propertyFilter,
        bookings,
        accommodations,
        pendingAccommodations,
        pendingOwners,
        pendingReports,
        reviews,
        approvedCount,
      }),
    [
      period,
      selectedRegion,
      propertyFilter,
      bookings,
      accommodations,
      pendingAccommodations,
      pendingOwners,
      pendingReports,
      reviews,
      approvedCount,
    ],
  );

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? period;

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-head">
          <div>
            <h1 className="admin-page-title">Resumen global</h1>
            <p className="admin-page-sub">Período: {periodLabel}</p>
          </div>
          <button
            type="button"
            className="admin-export-btn"
            onClick={() => exportDashboardCsv(data, periodLabel)}
          >
            <PrimeIcon name="pi-download" size={16} />
            Exportar CSV
          </button>
        </div>

        <div className="admin-filters-panel">
          <div className="admin-filters-grid">
            <div className="admin-filter-group">
              <span className="admin-filter-label" id="admin-filter-region">
                Región
              </span>
              <select
                id="admin-filter-region"
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                className="admin-select"
              >
                {ADMIN_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-filter-group">
              <span className="admin-filter-label" id="admin-filter-status">
                Estado hospedajes
              </span>
              <select
                id="admin-filter-status"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value as AdminPropertyFilter)}
                className="admin-select"
              >
                {PROPERTY_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-filter-group admin-filter-group--period">
              <span className="admin-filter-label">Período</span>
              <div className="admin-period-toggle" role="group" aria-label="Período">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`admin-period-btn${period === p.id ? " is-active" : ""}`}
                    onClick={() => setPeriod(p.id)}
                    aria-pressed={period === p.id}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {!data.hasEnoughData && (
        <div className="admin-dashboard-banner" role="status">
          <PrimeIcon name="pi-info-circle" size={18} />
          <p>
            Aún no hay suficientes reservas en este período. Los indicadores se actualizarán
            automáticamente.
          </p>
        </div>
      )}

      <section className="admin-kpi-grid" aria-label="Indicadores principales">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <div className="admin-charts-row">
        <section className="admin-card admin-card--wide" aria-label="Ingresos vs reservas">
          <h2 className="admin-card-title">Ingresos vs. Reservas diarias</h2>
          <div className="admin-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(v) => `S/${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const n = Number(value);
                    if (name === "Ingresos") return [formatMoney(n), name];
                    return [n, name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bookings"
                  name="Reservas"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-card" aria-label="Reservas por tipo">
          <h2 className="admin-card-title">Reservas por tipo de propiedad</h2>
          {data.typeDistribution.length === 0 ? (
            <p className="muted">Sin datos en el período</p>
          ) : (
            <div className="admin-donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.typeDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                  >
                    {data.typeDistribution.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="admin-legend-list">
                {data.typeDistribution.map((t) => (
                  <li key={t.name}>
                    <span className="admin-legend-dot" style={{ background: t.color }} />
                    {t.name} · {t.count} ({t.percent}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="admin-mid-row">
        <section className="admin-card admin-card--wide" aria-label="Rendimiento por región">
          <h2 className="admin-card-title">Ingresos por ciudad</h2>
          <div className="admin-chart-wrap admin-chart-wrap--bar">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.regionBars} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tickFormatter={(v) => `S/${v}`} />
                <YAxis type="category" dataKey="city" width={90} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="revenue" name="Ingresos" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-card" aria-label="Alertas del sistema">
          <h2 className="admin-card-title">Alertas del sistema</h2>
          {data.alerts.length === 0 ? (
            <p className="muted">Sin alertas pendientes</p>
          ) : (
            <ul className="admin-alert-list">
              {data.alerts.map((a) => (
                <li key={a.id} className={`admin-alert admin-alert--${a.priority}`}>
                  <PrimeIcon name={a.icon} size={18} />
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/moderacion" className="admin-link-btn">
            Ver todas las alertas
            <PrimeIcon name="pi-arrow-right" size={14} />
          </Link>
        </section>
      </div>

      <section className="admin-card" aria-label="Top propiedades">
        <div className="admin-card-head">
          <h2 className="admin-card-title">Top 5 propiedades por ocupación</h2>
          <Link to="/admin/moderacion" className="admin-link-btn">
            Ver todas las propiedades
            <PrimeIcon name="pi-arrow-right" size={14} />
          </Link>
        </div>
        {data.topProperties.length === 0 ? (
          <p className="muted">Sin datos de ocupación</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hospedaje</th>
                  <th>Ciudad</th>
                  <th>Ocupación</th>
                  <th>Ingresos</th>
                  <th>Reseñas</th>
                </tr>
              </thead>
              <tbody>
                {data.topProperties.map((p) => (
                  <tr key={p.name}>
                    <td>
                      {p.id > 0 ? (
                        <Link to={`/hospedajes/${p.id}`}>{p.name}</Link>
                      ) : (
                        p.name
                      )}
                    </td>
                    <td>{p.city}</td>
                    <td>{p.occupancy}%</td>
                    <td>{formatMoney(p.revenue)}</td>
                    <td>{p.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-bottom-row">
        <section className="admin-card" aria-label="Últimas reservas">
          <div className="admin-card-head">
            <h2 className="admin-card-title">Últimas reservas realizadas</h2>
            <Link to="/admin/reservas" className="admin-link-btn">
              Gestionar reservas
              <PrimeIcon name="pi-arrow-right" size={14} />
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Huésped</th>
                  <th>Hospedaje</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDate(b.created_at)}</td>
                    <td>{b.huesped.nombre}</td>
                    <td>{b.hospedaje}</td>
                    <td>{formatMoney(b.total_amount)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card" aria-label="Reseñas recientes">
          <h2 className="admin-card-title">Reseñas recientes</h2>
          {reviews.length === 0 ? (
            <p className="muted">Sin reseñas publicadas</p>
          ) : (
            <ul className="admin-review-list">
              {reviews.slice(0, 3).map((r) => (
                <li key={r.id} className="admin-review-item">
                  <div className="admin-review-meta">
                    <strong>★ {r.rating}</strong>
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                  <p className="admin-review-author">{r.autor_nombre}</p>
                  <p>
                    {r.comment.length > 100 ? `${r.comment.slice(0, 100)}…` : r.comment}
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
