import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOwnerCalendar, type OwnerCalendarDay } from "../../api/ownerCalendar";
import type { AccommodationListItem } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { StatusBadge } from "../StatusBadge";
import {
  addMonths,
  buildMonthGrid,
  monthYearLabel,
  parseDateString,
  toDateString,
  WEEKDAY_LABELS_ES,
  type CalendarCell,
} from "../../utils/calendarDates";
import { formatDate } from "../../utils/format";

type Props = {
  properties: AccommodationListItem[];
  initialAccommodationId?: number | null;
};

export function OwnerOccupancyCalendar({ properties, initialAccommodationId = null }: Props) {
  const today = toDateString(new Date());
  const initial = parseDateString(today) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [filterId, setFilterId] = useState<number | "">(() =>
    initialAccommodationId != null ? initialAccommodationId : "",
  );
  const [days, setDays] = useState<OwnerCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOwnerCalendar(
        viewYear,
        viewMonth + 1,
        filterId === "" ? null : filterId,
      );
      setDays(data.days);
    } catch (e) {
      setDays([]);
      setError(e instanceof Error ? e.message : "No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth, filterId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialAccommodationId != null) {
      setFilterId(initialAccommodationId);
    }
  }, [initialAccommodationId]);

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const navigateMonth = (delta: number) => {
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
    setSelectedDate(null);
  };

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <section
      className="owner-occupancy-calendar card"
      id="calendario-ocupacion"
      aria-label="Calendario de ocupación"
    >
      <div className="owner-occupancy-calendar-head">
        <div>
          <h2 className="owner-occupancy-calendar-title">Calendario de ocupación</h2>
          <p className="muted owner-occupancy-calendar-lead">
            Días con reservas activas (pendientes o confirmadas). El ámbar indica cupo parcial;
            el rojo, sin habitaciones libres.
          </p>
        </div>
        <label className="owner-occupancy-filter">
          <span className="owner-occupancy-filter-label">Local</span>
          <select
            value={filterId === "" ? "" : String(filterId)}
            onChange={(e) => {
              setFilterId(e.target.value ? Number(e.target.value) : "");
              setSelectedDate(null);
            }}
          >
            <option value="">Todos mis hospedajes</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="owner-occupancy-calendar-nav">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigateMonth(-1)}>
          ‹ Mes anterior
        </button>
        <strong>{monthYearLabel(viewYear, viewMonth, "es-PE")}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigateMonth(1)}>
          Mes siguiente ›
        </button>
      </div>

      <div className="owner-occupancy-legend">
        <span className="owner-occupancy-legend-item owner-occupancy-legend-item--free">Libre</span>
        <span className="owner-occupancy-legend-item owner-occupancy-legend-item--partial">
          Parcial
        </span>
        <span className="owner-occupancy-legend-item owner-occupancy-legend-item--full">
          Ocupado
        </span>
        <span className="owner-occupancy-legend-item owner-occupancy-legend-item--checkin">
          Entrada (check-in)
        </span>
      </div>

      {loading && <p className="muted owner-occupancy-loading">Cargando calendario…</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && (
        <>
          <div className="owner-occupancy-weekdays">
            {WEEKDAY_LABELS_ES.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="owner-occupancy-grid" role="grid">
            {buildMonthGrid(viewYear, viewMonth).map((cell: CalendarCell) => {
              const row = dayMap.get(cell.dateStr);
              const status = row?.status ?? "libre";
              const hasCheckIn = (row?.check_ins_count ?? 0) > 0;
              const isSelected = selectedDate === cell.dateStr;
              const classes = [
                "owner-occupancy-day",
                !cell.inCurrentMonth && "owner-occupancy-day--outside",
                cell.dateStr === today && "owner-occupancy-day--today",
                status === "ocupado" && "owner-occupancy-day--full",
                status === "parcial" && "owner-occupancy-day--partial",
                hasCheckIn && "owner-occupancy-day--checkin",
                isSelected && "owner-occupancy-day--selected",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  role="gridcell"
                  className={classes}
                  disabled={!cell.inCurrentMonth}
                  onClick={() => cell.inCurrentMonth && setSelectedDate(cell.dateStr)}
                  title={
                    row
                      ? `${row.occupied_rooms}/${row.total_rooms} hab. ocupadas`
                      : undefined
                  }
                >
                  <span className="owner-occupancy-day-num">{cell.day}</span>
                  {hasCheckIn && (
                    <span className="owner-occupancy-day-badge" aria-label="Check-in">
                      <PrimeIcon name="pi-sign-in" size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedDay && (
        <div className="owner-occupancy-day-detail">
          <h3>
            {formatDate(selectedDay.date)}
            {selectedDay.check_ins_count > 0 && (
              <span className="owner-occupancy-checkin-pill">
                {selectedDay.check_ins_count} check-in
                {selectedDay.check_ins_count > 1 ? "s" : ""}
              </span>
            )}
          </h3>
          {selectedDay.bookings.length === 0 ? (
            <p className="muted">Sin reservas esta noche.</p>
          ) : (
            <ul className="owner-occupancy-day-list">
              {selectedDay.bookings.map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>
                      {b.hospedaje} · Hab. {b.habitacion}
                    </strong>
                    <span className="muted">
                      {b.guest_name} · {formatDate(b.check_in)} → {formatDate(b.check_out)}
                    </span>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
