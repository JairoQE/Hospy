import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  BarChart,
  Cell,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardChartTooltipContent } from "@/components/charts/DashboardChartTooltipContent";
import {
  DashboardBarSeries,
  DashboardGrid,
  DashboardPie,
  DashboardSeries,
  StyledChartContainer,
  dashboardXAxisProps,
  dashboardYAxisProps,
} from "@/components/charts/dashboardCharts";
import {
  adminBarChartConfig,
  adminFlowChartConfig,
  adminRegionChartConfig,
} from "../dashboard/dashboardChartConfig";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "../../api/types";
import { formatDate, formatMoney } from "../../utils/format";
import {
  ADMIN_PERIOD_LABELS,
  ADMIN_REGIONS,
  type AdminDashboardSnapshot,
  type AdminKpi,
  type AdminPeriod,
  type AdminPropertyFilter,
  type TrendDir,
  buildAdminDashboard,
  exportDashboardCsv,
} from "../../utils/adminDashboardData";
import { AdminDateRangeField } from "./AdminDateRangeField";
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

function formatChartTooltipValue(value: number, name?: string): string {
  if (
    name?.includes("Ingreso") ||
    name?.includes("Cancelado") ||
    name?.includes("confirmados")
  ) {
    return formatMoney(value);
  }
  return String(value);
}

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
  onRefresh?: () => void;
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
  const accent =
    kpi.id === "revenue"
      ? "border-emerald-200 bg-emerald-50/40"
      : kpi.id === "cancellations"
        ? "border-rose-200 bg-rose-50/40"
        : kpi.id === "moderation" && kpi.value !== "0"
          ? "border-amber-200 bg-amber-50/40"
          : "";
  return (
    <Card
      className={`gap-3 py-4 shadow-sm transition-shadow hover:shadow-md ${accent}`.trim()}
      title={kpi.tooltip}
      aria-label={kpi.label}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PrimeIcon name={kpi.icon} size={20} />
        </span>
        <TrendBadge dir={kpi.trend} label={kpi.trendLabel} />
      </CardHeader>
      <CardContent className="px-4 pt-2">
        <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
        <p className="mt-1 text-sm font-semibold">{kpi.label}</p>
        <p className="text-xs text-muted-foreground">{kpi.sublabel}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: string;
  label: string;
  hint?: string;
}) {
  return (
    <Link to={to} className="admin-dash-quick-link">
      <PrimeIcon name={icon} size={18} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <PrimeIcon name="pi-arrow-right" size={14} />
    </Link>
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
  onRefresh,
}: Props) {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [propertyFilter, setPropertyFilter] = useState<AdminPropertyFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const customRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null;

  const data: AdminDashboardSnapshot = useMemo(
    () =>
      buildAdminDashboard({
        period,
        customRange,
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
      customRange,
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

  const periodLabel = customRange
    ? `${dateFrom} – ${dateTo}`
    : ADMIN_PERIOD_LABELS[period];

  const clearCustomRange = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="admin-dashboard admin-dashboard--v2">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-head">
          <div>
            <h1 className="admin-page-title">Centro de operaciones</h1>
            <p className="admin-page-sub">
              Ingresos, reservas y moderación · Período: {periodLabel}
            </p>
          </div>
          <div className="admin-dashboard-actions">
            {onRefresh && (
              <button type="button" className="admin-export-btn" onClick={onRefresh}>
                <PrimeIcon name="pi-refresh" size={16} />
                Actualizar
              </button>
            )}
            <button
              type="button"
              className="admin-export-btn"
              onClick={() => exportDashboardCsv(data, periodLabel)}
            >
              <PrimeIcon name="pi-download" size={16} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="admin-filters-panel admin-filters-panel--dashboard">
          <div className="admin-filters-grid admin-filters-grid--dashboard">
            <div className="admin-filter-group">
              <span className="admin-filter-label">Región</span>
              <select
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
              <span className="admin-filter-label">Estado hospedajes</span>
              <select
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
            <div className="admin-filter-group admin-filter-group--dates">
              <span className="admin-filter-label">Rango de fechas</span>
              <AdminDateRangeField
                from={dateFrom}
                to={dateTo}
                onChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
            </div>
            <div className="admin-filter-group admin-filter-group--period">
              <span className="admin-filter-label">Período rápido</span>
              <div className="admin-period-toggle" role="group" aria-label="Período">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`admin-period-btn${!customRange && period === p.id ? " is-active" : ""}`}
                    onClick={() => {
                      clearCustomRange();
                      setPeriod(p.id);
                    }}
                    aria-pressed={!customRange && period === p.id}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="admin-dash-quick-links" aria-label="Accesos rápidos">
        <QuickLink
          to="/admin/moderacion"
          icon="pi-home"
          label="Moderar hospedajes"
          hint={
            pendingAccommodations.length > 0
              ? `${pendingAccommodations.length} pendiente(s)`
              : undefined
          }
        />
        <QuickLink
          to="/admin/reservas"
          icon="pi-calendar"
          label="Gestionar reservas"
        />
        <QuickLink
          to="/admin/consultas"
          icon="pi-comments"
          label="Centro de moderación chat"
          hint={pendingReports > 0 ? `${pendingReports} reporte(s)` : undefined}
        />
        <QuickLink to="/admin/inicio" icon="pi-cog" label="Contenido del inicio" />
      </nav>

      {!data.hasEnoughData && (
        <div className="admin-dashboard-banner" role="status">
          <PrimeIcon name="pi-info-circle" size={18} />
          <p>
            Aún no hay suficientes reservas en este período. Los indicadores se actualizarán
            automáticamente.
          </p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores principales">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ingresos confirmados vs. monto cancelado</CardTitle>
          <CardDescription>Comparativo diario en el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <StyledChartContainer config={adminBarChartConfig} className="aspect-auto h-[320px] w-full">
            <BarChart data={data.dailySeries} barGap={6} barCategoryGap="22%">
              <DashboardGrid />
              <XAxis {...dashboardXAxisProps({ dataKey: "label" })} />
              <YAxis {...dashboardYAxisProps({ tickFormatter: (v) => `S/${v}` })} />
              <ChartTooltip
                content={
                  <DashboardChartTooltipContent
                    formatter={(value, name) =>
                      formatChartTooltipValue(Number(value), String(name))
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <DashboardBarSeries dataKey="confirmedRevenue" colorKey="confirmedRevenue" />
              <DashboardBarSeries dataKey="cancelledRevenue" colorKey="cancelledRevenue" />
            </BarChart>
          </StyledChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Flujo de ingresos y reservas</CardTitle>
            <CardDescription>Evolución diaria en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <StyledChartContainer config={adminFlowChartConfig} className="aspect-auto h-[300px] w-full">
              <AreaChart data={data.dailySeries}>
                <DashboardGrid />
                <XAxis {...dashboardXAxisProps({ dataKey: "label" })} />
                <YAxis
                  {...dashboardYAxisProps({
                    yAxisId: "left",
                    tickFormatter: (v) => `S/${v}`,
                  })}
                />
                <YAxis
                  {...dashboardYAxisProps({ yAxisId: "right", orientation: "right" })}
                />
                <ChartTooltip content={<DashboardChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <DashboardSeries yAxisId="left" dataKey="revenue" colorKey="revenue" />
                <DashboardSeries yAxisId="right" dataKey="bookings" colorKey="bookings" />
              </AreaChart>
            </StyledChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos por tipo de alojamiento</CardTitle>
          </CardHeader>
          <CardContent>
          {data.typeDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período</p>
          ) : (
            <>
              <StyledChartContainer
                config={Object.fromEntries(
                  data.typeDistribution.map((t) => [t.name, { label: t.name, color: t.color }]),
                ) satisfies ChartConfig}
                className="mx-auto aspect-square h-[220px] w-full max-w-[240px]"
              >
                <PieChart>
                  <ChartTooltip content={<DashboardChartTooltipContent hideLabel nameKey="name" />} />
                  <DashboardPie
                    data={data.typeDistribution}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={84}
                  >
                    {data.typeDistribution.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </DashboardPie>
                </PieChart>
              </StyledChartContainer>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {data.typeDistribution.map((t) => (
                  <li key={t.name} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ background: t.color }} />
                    {t.name} · {formatMoney(t.revenue)} ({t.percent}%)
                  </li>
                ))}
              </ul>
            </>
          )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos por ciudad</CardTitle>
          </CardHeader>
          <CardContent>
            <StyledChartContainer config={adminRegionChartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={data.regionBars} layout="vertical" margin={{ left: 8 }}>
                <DashboardGrid horizontal={false} />
                <XAxis type="number" {...dashboardXAxisProps({ tickFormatter: (v) => `S/${v}` })} />
                <YAxis type="category" {...dashboardYAxisProps({ dataKey: "city", width: 90, fontSize: 12 })} />
                <ChartTooltip
                  content={
                    <DashboardChartTooltipContent formatter={(v) => formatMoney(Number(v))} />
                  }
                />
                <DashboardBarSeries dataKey="revenue" colorKey="revenue" layout="vertical" />
              </BarChart>
            </StyledChartContainer>
          </CardContent>
        </Card>

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
