import type { AccommodationCalendarDay, CalendarDayStatus } from "../api/accommodationCalendar";
import { addDaysStr, compareDateStr } from "./calendarDates";

export type DayAvailabilityMap = Map<string, AccommodationCalendarDay>;

export function isDayFullyUnavailable(status: CalendarDayStatus | undefined): boolean {
  return status === "ocupado" || status === "bloqueado" || status === "inactiva";
}

export function rangeCrossesUnavailableNight(
  start: string,
  end: string,
  days: DayAvailabilityMap,
): boolean {
  if (compareDateStr(end, start) <= 0) return false;
  let cursor = start;
  while (compareDateStr(cursor, end) < 0) {
    const row = days.get(cursor);
    if (row && isDayFullyUnavailable(row.status)) return true;
    cursor = addDaysStr(cursor, 1);
  }
  return false;
}
