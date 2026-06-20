import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useProductTour } from "../../context/ProductTourContext";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { isTourRunning } from "../../productTour/runTour";
import { waitForTourDom } from "../../productTour/waitForTourDom";
import "../../styles/product-tour.css";

const HIDDEN_PREFIXES = ["/admin", "/login", "/registro", "/recuperar"];

export function ProductTourLauncher() {
  const { pathname } = useLocation();
  const { availableTourId, startTour } = useProductTour();
  const { t } = useLocaleCurrency();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!availableTourId) return null;
  if (isTourRunning()) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      className="product-tour-launcher"
      onClick={() => {
        void waitForTourDom(availableTourId).then((ready) => {
          if (ready) startTour(availableTourId, { force: true });
        });
      }}
      aria-label={t("tour.launcherLabel")}
      title={t("tour.launcherLabel")}
    >
      <span className="product-tour-launcher-icon" aria-hidden>
        ?
      </span>
      <span className="product-tour-launcher-text">{t("tour.launcherShort")}</span>
    </button>,
    document.body,
  );
}
