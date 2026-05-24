import { useCallback, useState } from "react";

export type GeoCoords = { lat: number; lng: number };

export type GeolocationStatus =
  | "prompt"
  | "loading"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

const SKIP_KEY = "hospy_location_skip";

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "unsupported";
    }
    if (localStorage.getItem(SKIP_KEY) === "1") {
      return "denied";
    }
    return "prompt";
  });
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.removeItem(SKIP_KEY);
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setErrorMessage(
            "No pudimos acceder a tu ubicación. Actívala en el navegador o explora con el buscador.",
          );
        } else if (err.code === err.TIMEOUT) {
          setStatus("error");
          setErrorMessage("La ubicación tardó demasiado. Intenta de nuevo.");
        } else {
          setStatus("error");
          setErrorMessage("No se pudo obtener tu ubicación. Intenta de nuevo.");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(SKIP_KEY, "1");
    setStatus("denied");
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(SKIP_KEY);
    setCoords(null);
    setErrorMessage("");
    setStatus("prompt");
  }, []);

  return { status, coords, errorMessage, request, skip, reset };
}
