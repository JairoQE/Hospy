import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useLocaleCurrency } from "./LocaleCurrencyContext";
import { destroyActiveTour, isTourRunning, runProductTour } from "../productTour/runTour";
import { isTourCompleted, markTourCompleted, resetTour as resetStoredTour } from "../productTour/storage";
import { resolveTourForRoute, TOUR_DEFINITIONS } from "../productTour/tours";
import type { TourId } from "../productTour/types";

type ProductTourContextValue = {
  activeTourId: TourId | null;
  availableTourId: TourId | null;
  startTour: (id: TourId, options?: { force?: boolean }) => boolean;
  resetTour: (id: TourId) => void;
  isRunning: boolean;
};

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

const AUTO_START_DELAY_MS = 900;

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useLocaleCurrency();
  const activeTourIdRef = useRef<TourId | null>(null);
  const autoStartedRef = useRef<string | null>(null);

  const availableTourId = useMemo(
    () => resolveTourForRoute(pathname, user?.role),
    [pathname, user?.role],
  );

  const startTour = useCallback(
    (id: TourId, options?: { force?: boolean }) => {
      if (isTourRunning()) return false;

      const definition = TOUR_DEFINITIONS[id];
      const started = runProductTour(definition, t, () => {
        activeTourIdRef.current = null;
        if (!options?.force || !isTourCompleted(id)) {
          markTourCompleted(id);
        }
      });

      if (started) {
        activeTourIdRef.current = id;
      }

      return started;
    },
    [t],
  );

  const resetTour = useCallback((id: TourId) => {
    resetStoredTour(id);
  }, []);

  useEffect(() => {
    destroyActiveTour();
    activeTourIdRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (!availableTourId) return;
    if (isTourCompleted(availableTourId)) return;

    const autoKey = `${availableTourId}:${pathname}:${user?.id ?? "anon"}`;
    if (autoStartedRef.current === autoKey) return;

    const timer = window.setTimeout(() => {
      if (isTourCompleted(availableTourId)) return;
      const started = startTour(availableTourId);
      if (started) {
        autoStartedRef.current = autoKey;
      }
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [availableTourId, pathname, startTour, user?.id]);

  const value = useMemo(
    () => ({
      activeTourId: activeTourIdRef.current,
      availableTourId,
      startTour,
      resetTour,
      isRunning: isTourRunning(),
    }),
    [availableTourId, startTour, resetTour],
  );

  return <ProductTourContext.Provider value={value}>{children}</ProductTourContext.Provider>;
}

export function useProductTour() {
  const ctx = useContext(ProductTourContext);
  if (!ctx) {
    throw new Error("useProductTour debe usarse dentro de ProductTourProvider");
  }
  return ctx;
}
