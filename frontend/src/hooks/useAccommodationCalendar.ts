import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAccommodationCalendar } from "../api/accommodationCalendar";
import type { PricingModel } from "../utils/pricingModel";
import {
  isDayFullyUnavailable,
  rangeCrossesUnavailableNight,
  type DayAvailabilityMap,
} from "../utils/calendarAvailability";

export { isDayFullyUnavailable, rangeCrossesUnavailableNight };

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

export function useAccommodationCalendar(accommodationId: number | undefined) {
  const [pricingModel, setPricingModel] = useState<PricingModel>("per_room");
  const [daysByDate, setDaysByDate] = useState<DayAvailabilityMap>(new Map());
  const [loadingMonths, setLoadingMonths] = useState<Set<string>>(new Set());

  const loadMonth = useCallback(
    async (year: number, month: number) => {
      if (!accommodationId) return;
      const key = monthKey(year, month);
      setLoadingMonths((prev) => new Set(prev).add(key));
      try {
        const data = await fetchAccommodationCalendar(accommodationId, year, month);
        setPricingModel(data.pricing_model);
        setDaysByDate((prev) => {
          const next = new Map(prev);
          for (const day of data.days) {
            next.set(day.date, day);
          }
          return next;
        });
      } finally {
        setLoadingMonths((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [accommodationId],
  );

  const ensureMonths = useCallback(
    (year: number, month: number, secondYear?: number, secondMonth?: number) => {
      void loadMonth(year, month);
      if (
        secondYear != null &&
        secondMonth != null &&
        (secondYear !== year || secondMonth !== month)
      ) {
        void loadMonth(secondYear, secondMonth);
      }
    },
    [loadMonth],
  );

  useEffect(() => {
    setDaysByDate(new Map());
  }, [accommodationId]);

  const isDateUnavailable = useCallback(
    (dateStr: string, minDate?: string) => {
      if (minDate && dateStr < minDate) return true;
      const row = daysByDate.get(dateStr);
      return row ? isDayFullyUnavailable(row.status) : false;
    },
    [daysByDate],
  );

  const loading = loadingMonths.size > 0;

  return useMemo(
    () => ({
      pricingModel,
      daysByDate,
      loading,
      ensureMonths,
      isDateUnavailable,
      rangeCrossesUnavailableNight: (start: string, end: string) =>
        rangeCrossesUnavailableNight(start, end, daysByDate),
    }),
    [pricingModel, daysByDate, loading, ensureMonths, isDateUnavailable],
  );
}
