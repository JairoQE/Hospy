import { useMemo, useState } from "react";
import {
  AreaChart,
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
  DashboardGrid,
  DashboardPie,
  DashboardSeries,
  StyledChartContainer,
  dashboardXAxisProps,
  dashboardYAxisProps,
} from "@/components/charts/dashboardCharts";
import { ownerPerformanceChartConfig } from "../dashboard/dashboardChartConfig";
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

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ocupación e ingresos diarios</CardTitle>
            <CardDescription>{data.propertyLabel} · comparado con el período anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <StyledChartContainer config={ownerPerformanceChartConfig} className="aspect-auto h-[280px] w-full">
              <AreaChart data={data.dailySeries}>
                <DashboardGrid />
                <XAxis {...dashboardXAxisProps({ dataKey: "label", interval: "preserveStartEnd" })} />
                <YAxis
                  {...dashboardYAxisProps({
                    yAxisId: "left",
                    tickFormatter: (v) => `${v}%`,
                    domain: [0, 100],
                  })}
                />
                <YAxis
                  {...dashboardYAxisProps({
                    yAxisId: "right",
                    orientation: "right",
                    tickFormatter: (v) => `S/${v}`,
                  })}
                />
                <ChartTooltip
                  content={
                    <DashboardChartTooltipContent
                      formatter={(value, name) =>
                        name === "Ingresos"
                          ? `S/ ${Number(value).toLocaleString("es-PE")}`
                          : `${value}%`
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <DashboardSeries yAxisId="left" dataKey="occupancy" colorKey="occupancy" name="Ocupación" />
                <DashboardSeries yAxisId="right" dataKey="revenue" colorKey="revenue" name="Ingresos" />
              </AreaChart>
            </StyledChartContainer>
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Reservas por estado</CardTitle>
              <CardDescription>Reservas creadas en el período</CardDescription>
            </CardHeader>
            <CardContent>
            {data.bookingStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas en el período</p>
            ) : (
              <>
                <StyledChartContainer
                  config={Object.fromEntries(
                    data.bookingStatuses.map((s) => [
                      s.name,
                      { label: s.name, color: s.color },
                    ]),
                  ) satisfies ChartConfig}
                  className="mx-auto aspect-square h-[200px] w-full max-w-[220px]"
                >
                  <PieChart>
                    <ChartTooltip content={<DashboardChartTooltipContent hideLabel nameKey="name" />} />
                    <DashboardPie
                      data={data.bookingStatuses}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={80}
                    >
                      {data.bookingStatuses.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </DashboardPie>
                  </PieChart>
                </StyledChartContainer>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {data.bookingStatuses.map((s) => (
                    <li key={s.status} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                      {s.name} · {s.count} ({s.percent}%)
                    </li>
                  ))}
                </ul>
              </>
            )}
            </CardContent>
          </Card>

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
