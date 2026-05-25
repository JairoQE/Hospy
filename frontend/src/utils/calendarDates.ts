/** Utilidades de fechas (YYYY-MM-DD) sin dependencias externas. */

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function compareDateStr(a: string, b: string): number {
  return a.localeCompare(b);
}

export function nightsBetween(start: string, end: string): number {
  const a = parseDateString(start);
  const b = parseDateString(end);
  if (!a || !b) return 0;
  const diff = (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 ? diff : 0;
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isInRange(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const s = start <= end ? start : end;
  const e = start <= end ? end : start;
  return date >= s && date <= e;
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthYearLabel(year: number, month: number, lang: "es-PE" | "en" = "es-PE"): string {
  const names = lang === "en" ? MONTH_NAMES_EN : MONTH_NAMES_ES;
  return `${names[month]} ${year}`;
}

export const WEEKDAY_LABELS_ES = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
export const WEEKDAY_LABELS_EN = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export type CalendarCell = {
  dateStr: string;
  day: number;
  inCurrentMonth: boolean;
};

/** Cuadrícula de 6 semanas × 7 días empezando en domingo. */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const gridStart = new Date(year, month, 1 - startPad);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      dateStr: toDateString(d),
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export function formatDisplayDate(dateStr: string | null, lang: "es-PE" | "en" = "es-PE"): string {
  if (!dateStr) return "—";
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
