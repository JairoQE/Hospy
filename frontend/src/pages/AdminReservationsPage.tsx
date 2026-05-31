import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartTooltip,
} from "@/components/ui/chart";
import { DashboardChartTooltipContent } from "@/components/charts/DashboardChartTooltipContent";
import {
  DashboardGrid,
  DashboardSeries,
  StyledChartContainer,
  dashboardXAxisProps,
  dashboardYAxisProps,
} from "@/components/charts/dashboardCharts";
import { adminBookingsTrendConfig } from "../components/dashboard/dashboardChartConfig";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { Booking, Paginated } from "../api/types";
import { AdminDateField } from "../components/admin/AdminDateField";
import { AdminUsersToastHost, showAdminToast } from "../components/admin/AdminUsersToast";
import { PrimeIcon } from "../components/PrimeIcon";
import { StatusBadge } from "../components/StatusBadge";
import {
  adminCanCancel,
  buildDailySeries,
  computeBookingMetrics,
  isSoonCheckIn,
  matchesBookingSearch,
  matchesCityFilter,
  matchesDateRange,
  matchesStatusFilter,
  sortBookings,
  type BookingStatusFilter,
} from "../utils/adminBookingsData";
import { exportTableCsv, type SortDir } from "../utils/adminUsersData";
import { formatDate, formatMoney, statusLabel } from "../utils/format";

const PAGE_SIZES = [10, 25, 50] as const;

async function fetchAllBookings(): Promise<Booking[]> {
  let page = 1;
  const all: Booking[] = [];
  for (;;) {
    const data = await api.get<Paginated<Booking>>(`/reservas/?page=${page}&page_size=100`);
    all.push(...unwrapList(data));
    if (!data.next) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: string;
  current: string;
  dir: SortDir;
  onSort: (key: string) => void;
}) {
  const active = current === sortKey;
  return (
    <th>
      <button type="button" className="admin-users-sort-btn" onClick={() => onSort(sortKey)}>
        {label}
        <PrimeIcon
          name={active ? (dir === "asc" ? "pi-sort-up" : "pi-sort-down") : "pi-sort-alt"}
          size={12}
        />
      </button>
    </th>
  );
}

function GuestAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span className="admin-users-avatar" aria-hidden>
      {initial}
    </span>
  );
}

export function AdminReservationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const [cityFilter, setCityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateField, setDateField] = useState<"check_in" | "created_at">("check_in");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [sortKey, setSortKey] = useState("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<Booking | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllBookings()
      .then(setBookings)
      .catch(() => showAdminToast("No se pudieron cargar las reservas.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => computeBookingMetrics(bookings), [bookings]);
  const chartData = useMemo(() => buildDailySeries(bookings), [bookings]);

  const cities = useMemo(
    () => [...new Set(bookings.map((b) => b.ciudad).filter(Boolean))].sort(),
    [bookings],
  );

  const filtered = useMemo(() => {
    let rows = bookings.filter(
      (b) =>
        matchesBookingSearch(b, search) &&
        matchesStatusFilter(b, statusFilter) &&
        matchesCityFilter(b, cityFilter) &&
        matchesDateRange(b, dateFrom, dateTo, dateField),
    );
    return sortBookings(rows, sortKey, sortDir);
  }, [bookings, search, statusFilter, cityFilter, dateFrom, dateTo, dateField, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, cityFilter, dateFrom, dateTo, dateField, pageSize, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelBooking = async (b: Booking) => {
    if (!window.confirm(`¿Cancelar la reserva #${b.id}?`)) return;
    try {
      await api.post(`/reservas/${b.id}/cancelar/`);
      showAdminToast(`Reserva #${b.id} cancelada.`, "success");
      setDetail(null);
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "No se pudo cancelar", "error");
    }
  };

  const bulkCancel = async () => {
    const ids = [...selected].filter((id) => {
      const b = bookings.find((x) => x.id === id);
      return b && adminCanCancel(b);
    });
    if (ids.length === 0) return;
    if (!window.confirm(`¿Cancelar ${ids.length} reserva(s) seleccionada(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(ids.map((id) => api.post(`/reservas/${id}/cancelar/`)));
      showAdminToast(`${ids.length} reserva(s) cancelada(s).`, "success");
      setSelected(new Set());
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "Error en cancelación masiva", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "ID",
      "Fecha reserva",
      "Huésped",
      "Correo",
      "Hospedaje",
      "Ciudad",
      "Entrada",
      "Salida",
      "Monto",
      "Estado",
    ];
    const rows = filtered.map((b) => [
      String(b.id),
      formatDate(b.created_at),
      b.huesped.nombre,
      b.huesped.email,
      b.hospedaje,
      b.ciudad,
      formatDate(b.check_in),
      formatDate(b.check_out),
      String(b.total_amount),
      statusLabel(b.status),
    ]);
    exportTableCsv("hospy-reservas.csv", headers, rows);
    showAdminToast("Exportado en CSV.", "info");
  };

  return (
    <div className="admin-page admin-bookings-hub">
      <AdminUsersToastHost />

      <header className="admin-users-header">
        <div>
          <h1 className="admin-page-title">Gestión de reservas</h1>
          <p className="admin-page-sub">
            Consulta ingresos, filtra por estado y gestiona cada reserva de la plataforma.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
        >
          <PrimeIcon name="pi-download" size={14} />
          Exportar CSV
        </button>
      </header>

      {!loading && (
        <div className="admin-bookings-top">
          <section className="admin-bookings-kpis-grid" aria-label="Métricas">
            <article className="admin-kpi-card">
              <div className="admin-kpi-card-top">
                <span className="admin-kpi-icon">
                  <PrimeIcon name="pi-wallet" size={18} />
                </span>
              </div>
              <p className="admin-kpi-value">{formatMoney(metrics.revenueMonth)}</p>
              <p className="admin-kpi-label">Ingresos (este mes)</p>
              <p className="admin-kpi-sublabel">{formatMoney(metrics.revenueAll)} en total</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-value">{metrics.completed}</p>
              <p className="admin-kpi-label">Completadas</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-value">{metrics.cancelled}</p>
              <p className="admin-kpi-label">Canceladas</p>
              <p className="admin-kpi-sublabel">Tasa {metrics.cancelRate}%</p>
            </article>
            <article className="admin-kpi-card">
              <p className="admin-kpi-value">{metrics.upcoming}</p>
              <p className="admin-kpi-label">Próximas entradas</p>
              <p className="admin-kpi-sublabel">7 días · confirmadas o pendientes</p>
            </article>
          </section>

          <aside aria-label="Tendencia 30 días">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Reservas por día</CardTitle>
              </CardHeader>
              <CardContent>
                <StyledChartContainer config={adminBookingsTrendConfig} className="aspect-auto h-[260px] w-full">
                  <AreaChart data={chartData}>
                    <DashboardGrid />
                    <XAxis
                      {...dashboardXAxisProps({
                        dataKey: "date",
                        tickFormatter: (v) => String(v).slice(5),
                        fontSize: 10,
                      })}
                    />
                    <YAxis
                      {...dashboardYAxisProps({ allowDecimals: false, width: 32, fontSize: 10 })}
                    />
                    <ChartTooltip
                      labelFormatter={(v) => formatDate(String(v))}
                      content={<DashboardChartTooltipContent />}
                    />
                    <DashboardSeries dataKey="count" colorKey="count" />
                  </AreaChart>
                </StyledChartContainer>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      <div className="admin-users-toolbar-card">
        <form className="admin-users-toolbar" onSubmit={handleSearch} role="search">
          <div className="admin-users-search">
            <span className="admin-users-search-icon" aria-hidden>
              <PrimeIcon name="pi-search" size={16} />
            </span>
            <input
              type="search"
              placeholder="Buscar por huésped, hospedaje, ciudad o ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar reservas"
            />
          </div>
          <div className="admin-users-toolbar-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Buscar
            </button>
            {(search ||
              statusFilter !== "all" ||
              cityFilter ||
              dateFrom ||
              dateTo) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("all");
                  setCityFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </form>

        <div className="admin-users-toolbar-filters">
          <div className="admin-users-filters">
            <span className="admin-users-filters-label">Estado</span>
            <div className="admin-users-filters-chips">
              {(
                [
                  ["all", "Todas"],
                  ["confirmada", "Confirmada"],
                  ["pendiente", "Pendiente"],
                  ["completada", "Completada"],
                  ["cancelada", "Cancelada"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`admin-users-chip${statusFilter === id ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-bookings-filter-row">
          <label className="admin-bookings-filter">
            <span className="admin-users-filters-label">Ciudad</span>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">Todas</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-bookings-filter">
            <span className="admin-users-filters-label">Filtrar fechas por</span>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as "check_in" | "created_at")}
            >
              <option value="check_in">Entrada</option>
              <option value="created_at">Reserva</option>
            </select>
          </label>
          <div className="admin-bookings-filter admin-bookings-filter--date">
            <AdminDateField label="Desde" value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="admin-bookings-filter admin-bookings-filter--date">
            <AdminDateField label="Hasta" value={dateTo} onChange={setDateTo} />
          </div>
          <label className="admin-bookings-filter">
            <span className="admin-users-filters-label">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          </div>
        </div>
      </div>

      {loading && <p className="admin-loading">Cargando reservas…</p>}

      {!loading && filtered.length === 0 && (
        <div className="admin-users-empty">
          <PrimeIcon name="pi-calendar" size={36} />
          <p className="admin-users-empty-title">No hay reservas</p>
          <p className="muted">Prueba otros filtros o limpia la búsqueda.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <section className="admin-users-table-card">
          <div className="admin-bookings-table-head">
            <p className="muted">
              {filtered.length} reserva(s) · página {page} de {totalPages}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setSelected(
                  selected.size === pageRows.length
                    ? new Set()
                    : new Set(pageRows.map((b) => b.id)),
                )
              }
            >
              {selected.size === pageRows.length ? "Quitar selección" : "Seleccionar página"}
            </button>
          </div>
          <div className="admin-table-wrap admin-bookings-table-wrap">
            <table className="admin-table admin-table--bookings">
              <thead>
                <tr>
                  <th className="admin-bookings-check-col">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <SortableTh
                    label="ID"
                    sortKey="id"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Fecha"
                    sortKey="created"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Huésped"
                    sortKey="guest"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Hospedaje"
                    sortKey="hospedaje"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th>Ciudad</th>
                  <SortableTh
                    label="Entrada"
                    sortKey="check_in"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th>Salida</th>
                  <SortableTh
                    label="Monto"
                    sortKey="amount"
                    current={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((b) => (
                  <tr
                    key={b.id}
                    className={[
                      isSoonCheckIn(b) ? "admin-bookings-row--soon" : "",
                      b.status === "cancelada" ? "admin-bookings-row--cancelled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                        aria-label={`Seleccionar reserva ${b.id}`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-bookings-id-btn"
                        onClick={() => setDetail(b)}
                      >
                        #{b.id}
                      </button>
                    </td>
                    <td>{formatDate(b.created_at)}</td>
                    <td>
                      <div className="admin-users-name-cell">
                        <GuestAvatar name={b.huesped.nombre} />
                        <span>{b.huesped.nombre}</span>
                      </div>
                    </td>
                    <td>
                      {b.accommodation_id ? (
                        <Link to={`/hospedajes/${b.accommodation_id}`}>{b.hospedaje}</Link>
                      ) : (
                        b.hospedaje
                      )}
                    </td>
                    <td>{b.ciudad}</td>
                    <td>
                      {formatDate(b.check_in)}
                      {isSoonCheckIn(b) && (
                        <span className="admin-users-badge admin-users-badge--warn admin-bookings-soon">
                          Próxima
                        </span>
                      )}
                    </td>
                    <td>{formatDate(b.check_out)}</td>
                    <td>{formatMoney(b.total_amount)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>
                      <div className="admin-users-row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDetail(b)}
                          title="Ver detalle"
                        >
                          Ver
                        </button>
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`mailto:${b.huesped.email}`}
                          title="Contactar huésped"
                        >
                          Email
                        </a>
                        {adminCanCancel(b) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm admin-mod-btn-reject"
                            onClick={() => void cancelBooking(b)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="admin-users-pagination">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="muted">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
      )}

      {selected.size > 0 && (
        <div className="admin-mod-bulk-bar">
          <span>{selected.size} seleccionada(s)</span>
          <button
            type="button"
            className="btn btn-outline btn-sm admin-mod-btn-reject"
            disabled={bulkLoading}
            onClick={() => void bulkCancel()}
          >
            {bulkLoading ? "Cancelando…" : "Cancelar seleccionadas"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
            Cerrar
          </button>
        </div>
      )}

      {detail && (
        <div
          className="admin-users-drawer-overlay"
          role="presentation"
          onClick={() => setDetail(null)}
        >
          <aside
            className="admin-users-drawer admin-bookings-drawer"
            role="dialog"
            aria-labelledby="booking-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-users-drawer-header">
              <h2 id="booking-detail-title">Reserva #{detail.id}</h2>
              <button
                type="button"
                className="map-modal-close"
                onClick={() => setDetail(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <StatusBadge status={detail.status} />
            <dl className="admin-bookings-detail-list">
              <dt>Huésped</dt>
              <dd>
                {detail.huesped.nombre}
                <br />
                <a href={`mailto:${detail.huesped.email}`}>{detail.huesped.email}</a>
                <br />
                <Link to={`/perfil/${detail.huesped.id}`}>Ver perfil</Link>
              </dd>
              <dt>Hospedaje</dt>
              <dd>
                {detail.hospedaje} · Hab. {detail.habitacion}
                {detail.accommodation_id && (
                  <>
                    <br />
                    <Link to={`/hospedajes/${detail.accommodation_id}`}>Ver ficha</Link>
                  </>
                )}
              </dd>
              <dt>Ciudad</dt>
              <dd>{detail.ciudad}</dd>
              <dt>Entrada / Salida</dt>
              <dd>
                {formatDate(detail.check_in)} → {formatDate(detail.check_out)}
              </dd>
              <dt>Monto total</dt>
              <dd>{formatMoney(detail.total_amount)}</dd>
              <dt>Fecha de reserva</dt>
              <dd>{formatDate(detail.created_at)}</dd>
              {detail.cancel_reason && (
                <>
                  <dt>Motivo cancelación</dt>
                  <dd>{detail.cancel_reason}</dd>
                </>
              )}
            </dl>
            <div className="admin-mod-actions">
              <a className="btn btn-outline btn-sm" href={`mailto:${detail.huesped.email}`}>
                Contactar huésped
              </a>
              {adminCanCancel(detail) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm admin-mod-btn-reject"
                  onClick={() => void cancelBooking(detail)}
                >
                  Cancelar reserva
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
