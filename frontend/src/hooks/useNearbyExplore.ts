import { useEffect, useState } from "react";
import {
  fetchNearbyExplore,
  type NearbyExploreResponse,
} from "../api/nearby";

export function useNearbyExplore(
  lat: number | null | undefined,
  lng: number | null | undefined,
  city = "",
  radioKm = 25,
) {
  const [data, setData] = useState<NearbyExploreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      (lat === 0 && lng === 0)
    ) {
      setData(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchNearbyExplore({ lat, lng, radio_km: radioKm, ciudad: city })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, city, radioKm]);

  return { data, loading, error };
}
