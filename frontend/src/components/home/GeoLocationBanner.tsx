import type { GeolocationStatus } from "../../hooks/useGeolocation";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { IconMapPin, IconSpinner } from "../icons";

type Props = {
  status: GeolocationStatus;
  onActivate: () => void;
  onSkip: () => void;
};

export function GeoLocationBanner({ status, onActivate, onSkip }: Props) {
  const { t } = useLocaleCurrency();

  if (status !== "prompt" && status !== "loading") return null;

  return (
    <aside className="geo-banner fade-in" aria-label={t("geo.title")}>
      <span className="geo-banner-icon" aria-hidden>
        <IconMapPin size={28} />
      </span>
      <p className="geo-banner-text">
        <strong>{t("geo.title")}</strong>
        <span className="geo-banner-sub">{t("geo.sub")}</span>
      </p>
      <div className="geo-banner-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onActivate}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <IconSpinner size={18} /> {t("geo.loading")}
            </>
          ) : (
            t("geo.activate")
          )}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onSkip}>
          {t("geo.skip")}
        </button>
      </div>
    </aside>
  );
}
