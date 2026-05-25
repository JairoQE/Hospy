import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  buildMonthGrid,
  compareDateStr,
  formatDisplayDate,
  isInRange,
  isSameDay,
  monthYearLabel,
  nightsBetween,
  parseDateString,
  toDateString,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_ES,
  type CalendarCell,
} from "../../utils/calendarDates";
import "../../styles/date-range-calendar.css";

export type DateRangeCalendarProps = {
  mode?: "range" | "single";
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  minDate?: string;
  maxDate?: string;
  isDateDisabled?: (dateStr: string) => boolean;
  specialDates?: Set<string>;
  language?: "es-PE" | "en";
  showPresets?: boolean;
  showToolbar?: boolean;
  showFooter?: boolean;
  marketingHint?: string;
  className?: string;
};

function todayStr(): string {
  return toDateString(new Date());
}

export function DateRangeCalendar({
  mode = "range",
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  specialDates,
  language = "es-PE",
  showPresets = true,
  showToolbar = true,
  showFooter = true,
  marketingHint,
  className = "",
}: DateRangeCalendarProps) {
  const today = todayStr();
  const initial = parseDateString(startDate ?? today) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [twoMonths, setTwoMonths] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const update = (width: number) => {
      const wideViewport = window.matchMedia("(min-width: 768px)").matches;
      setTwoMonths(wideViewport && width >= 580);
    };

    const panel =
      root.closest(".date-picker-popover--portal") ??
      root.closest(".availability-search--calendar") ??
      root.parentElement;

    if (!panel) {
      update(root.offsetWidth);
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? panel.getBoundingClientRect().width;
      update(w);
    });
    ro.observe(panel);
    update(panel.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const secondMonth = addMonths(viewYear, viewMonth, 1);
  const weekdays = language === "en" ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_ES;

  const labels = useMemo(
    () => ({
      from: language === "en" ? "From" : "Desde",
      to: language === "en" ? "To" : "Hasta",
      clear: language === "en" ? "Clear" : "Borrar",
      today: language === "en" ? "Today" : "Hoy",
      nights: (n: number) =>
        language === "en"
          ? n === 1
            ? "1 night"
            : `${n} nights`
          : n === 1
            ? "1 noche"
            : `${n} noches`,
      presetWeekend: language === "en" ? "This weekend" : "Este fin de semana",
      preset7: language === "en" ? "Next 7 days" : "Próximos 7 días",
      hintDiscount:
        language === "en"
          ? "Stay 2+ nights and unlock better deals!"
          : "¡Elige 2 noches o más y obtén mejores tarifas!",
      unavailable: language === "en" ? "Not available" : "No disponible",
    }),
    [language],
  );

  const navigateMonth = (delta: number) => {
    setAnimating(true);
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
    window.setTimeout(() => setAnimating(false), 180);
  };

  const isDisabled = useCallback(
    (dateStr: string) => {
      if (minDate && dateStr < minDate) return true;
      if (maxDate && dateStr > maxDate) return true;
      if (isDateDisabled?.(dateStr)) return true;
      return false;
    },
    [minDate, maxDate, isDateDisabled],
  );

  const handleDayClick = (dateStr: string) => {
    if (isDisabled(dateStr)) return;

    if (mode === "single") {
      onChange(dateStr, null);
      return;
    }

    if (!startDate || (startDate && endDate)) {
      onChange(dateStr, null);
      return;
    }

    if (compareDateStr(dateStr, startDate) < 0) {
      onChange(dateStr, null);
      return;
    }

    if (isSameDay(dateStr, startDate)) {
      onChange(dateStr, null);
      return;
    }

    onChange(startDate, dateStr);
  };

  const clear = () => onChange(null, null);

  const goToday = () => {
    const t = todayStr();
    const d = parseDateString(t)!;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    if (mode === "single") {
      onChange(t, null);
    } else if (!startDate || endDate) {
      onChange(t, null);
    }
  };

  const addDaysStrLocal = (s: string, n: number): string => {
    const d = parseDateString(s)!;
    d.setDate(d.getDate() + n);
    return toDateString(d);
  };

  const applyPresetWeekend = () => {
    const now = new Date();
    const dow = now.getDay();
    const sat = new Date(now);
    if (dow === 6) {
      /* hoy sábado */
    } else if (dow === 0) {
      sat.setDate(now.getDate() + 6);
    } else {
      sat.setDate(now.getDate() + (6 - dow));
    }
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    onChange(toDateString(sat), toDateString(sun));
    setViewYear(sat.getFullYear());
    setViewMonth(sat.getMonth());
  };

  const applyPreset7Days = () => {
    const start = todayStr();
    onChange(start, addDaysStrLocal(start, 7));
  };

  const nights =
    startDate && endDate && compareDateStr(endDate, startDate) > 0
      ? nightsBetween(startDate, endDate)
      : 0;

  const getDayClass = (cell: CalendarCell) => {
    const { dateStr } = cell;
    const classes = ["date-range-calendar-day"];
    if (!cell.inCurrentMonth) classes.push("date-range-calendar-day--outside");
    if (isSameDay(dateStr, today)) classes.push("date-range-calendar-day--today");
    if (isDisabled(dateStr)) classes.push("date-range-calendar-day--disabled");
    if (specialDates?.has(dateStr)) classes.push("date-range-calendar-day--special");

    const rangeEnd = endDate ?? (startDate && hoverDate && !endDate ? hoverDate : null);
    const rangeStart = startDate;

    if (mode === "range" && rangeStart) {
      const end = rangeEnd && compareDateStr(rangeEnd, rangeStart) >= 0 ? rangeEnd : null;
      const inMonth = cell.inCurrentMonth;
      if (end && isSameDay(dateStr, rangeStart)) {
        classes.push(inMonth ? "date-range-calendar-day--range-start" : "date-range-calendar-day--range-between");
      } else if (end && isSameDay(dateStr, end)) {
        classes.push(inMonth ? "date-range-calendar-day--range-end" : "date-range-calendar-day--range-between");
      } else if (end && isInRange(dateStr, rangeStart, end)) {
        classes.push("date-range-calendar-day--range-between");
      } else if (isSameDay(dateStr, rangeStart) && !end) {
        classes.push("date-range-calendar-day--range-start");
      }
    }

    if (mode === "single" && startDate && isSameDay(dateStr, startDate)) {
      classes.push("date-range-calendar-day--range-start");
    }

    return classes.join(" ");
  };

  const renderMonth = (year: number, month: number, monthIdx: number, showNav: boolean) => (
    <div
      className={`date-range-calendar-month${monthIdx === 1 ? " date-range-calendar-month--second" : ""}`}
    >
      <div className="date-range-calendar-month-head">
        {showNav && (
          <button
            type="button"
            className="date-range-calendar-nav"
            onClick={() => navigateMonth(-1)}
            aria-label={language === "en" ? "Previous month" : "Mes anterior"}
          >
            ‹
          </button>
        )}
        <div className="date-range-calendar-month-title-wrap">
          <button
            type="button"
            className="date-range-calendar-month-title"
            onClick={() => monthIdx === 0 && setPickerOpen((o) => !o)}
          >
            {monthYearLabel(year, month, language)}
          </button>
          {pickerOpen && monthIdx === 0 && (
            <div className="date-range-calendar-month-picker" role="listbox">
              {Array.from({ length: 24 }, (_, i) => {
                const y = new Date().getFullYear() - 1 + Math.floor(i / 12);
                const m = i % 12;
                return (
                  <button
                    key={`${y}-${m}`}
                    type="button"
                    className={y === viewYear && m === viewMonth ? "is-active" : ""}
                    onClick={() => {
                      setViewYear(y);
                      setViewMonth(m);
                      setPickerOpen(false);
                    }}
                  >
                    {monthYearLabel(y, m, language).slice(0, 3)} {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {showNav && (
          <button
            type="button"
            className="date-range-calendar-nav"
            onClick={() => navigateMonth(1)}
            aria-label={language === "en" ? "Next month" : "Mes siguiente"}
          >
            ›
          </button>
        )}
        {!showNav && monthIdx === 1 && <span style={{ width: 32 }} />}
      </div>
      <div className="date-range-calendar-weekdays" role="row">
        {weekdays.map((w) => (
          <span key={w} className="date-range-calendar-weekday" role="columnheader">
            {w}
          </span>
        ))}
      </div>
      <div className="date-range-calendar-days" role="grid">
        {buildMonthGrid(year, month).map((cell) => (
          <button
            key={`${year}-${month}-${cell.dateStr}`}
            type="button"
            role="gridcell"
            aria-selected={
              isSameDay(cell.dateStr, startDate ?? "") ||
              isSameDay(cell.dateStr, endDate ?? "")
            }
            aria-disabled={isDisabled(cell.dateStr)}
            title={isDisabled(cell.dateStr) ? labels.unavailable : undefined}
            className={getDayClass(cell)}
            onClick={() => handleDayClick(cell.dateStr)}
            onMouseEnter={() => mode === "range" && startDate && !endDate && setHoverDate(cell.dateStr)}
            onMouseLeave={() => setHoverDate(null)}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`date-range-calendar ${className}`.trim()}
      role="application"
      aria-label={language === "en" ? "Date picker" : "Selector de fechas"}
      onKeyDown={(e) => {
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          clear();
        }
        if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          goToday();
        }
      }}
    >
      {showToolbar && (
        <div className="date-range-calendar-toolbar">
          <div className="date-range-calendar-range-summary">
            <span>
              {labels.from}: <strong>{formatDisplayDate(startDate, language)}</strong>
            </span>
            {mode === "range" && (
              <span>
                {labels.to}: <strong>{formatDisplayDate(endDate, language)}</strong>
              </span>
            )}
            {nights > 0 && (
              <span className="date-range-calendar-nights">{labels.nights(nights)}</span>
            )}
          </div>
          <div className="date-range-calendar-actions">
            <button type="button" className="date-range-calendar-btn-text" onClick={goToday}>
              {labels.today}
            </button>
            <button type="button" className="date-range-calendar-btn-ghost" onClick={clear}>
              {labels.clear}
            </button>
          </div>
        </div>
      )}

      {!showToolbar && (
        <div className="date-range-calendar-toolbar date-range-calendar-toolbar--compact">
          <div className="date-range-calendar-actions">
            <button type="button" className="date-range-calendar-btn-text" onClick={goToday}>
              {labels.today}
            </button>
            <button type="button" className="date-range-calendar-btn-ghost" onClick={clear}>
              {labels.clear}
            </button>
          </div>
          {nights > 0 && (
            <span className="date-range-calendar-nights">{labels.nights(nights)}</span>
          )}
        </div>
      )}

      {showPresets && mode === "range" && (
        <div className="date-range-calendar-presets">
          <button type="button" className="date-range-calendar-preset" onClick={applyPresetWeekend}>
            {labels.presetWeekend}
          </button>
          <button type="button" className="date-range-calendar-preset" onClick={applyPreset7Days}>
            {labels.preset7}
          </button>
        </div>
      )}

      <div className={`date-range-calendar-months${animating ? " is-animating" : ""}`}>
        {renderMonth(viewYear, viewMonth, 0, !twoMonths)}
        {twoMonths && renderMonth(secondMonth.year, secondMonth.month, 1, false)}
      </div>

      {showFooter && (marketingHint || mode === "range") && (
        <div className="date-range-calendar-footer">
          {marketingHint ?? labels.hintDiscount}
        </div>
      )}
    </div>
  );
}
