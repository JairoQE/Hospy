import { useEffect } from "react";
import { fetchGeoHints } from "../../api/geo";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

const GEO_BOOTSTRAP_KEY = "hospy-geo-bootstrap";

/** Aplica idioma/moneda sugeridos por ip.guide (solo la primera visita). */
export function GeoHintsBootstrap() {
  const { setLanguage, setCurrency } = useLocaleCurrency();

  useEffect(() => {
    if (localStorage.getItem(GEO_BOOTSTRAP_KEY)) return;
    let cancelled = false;
    fetchGeoHints()
      .then(({ hints }) => {
        if (cancelled || !hints.detected) return;
        if (hints.language === "en" || hints.language === "es-PE") {
          setLanguage(hints.language);
        }
        if (hints.currency === "USD" || hints.currency === "PEN") {
          setCurrency(hints.currency);
        }
        localStorage.setItem(GEO_BOOTSTRAP_KEY, "1");
      })
      .catch(() => {
        /* ip.guide opcional */
      });
    return () => {
      cancelled = true;
    };
  }, [setLanguage, setCurrency]);

  return null;
}
