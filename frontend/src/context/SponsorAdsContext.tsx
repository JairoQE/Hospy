import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { Paginated, SponsorAd } from "../api/types";
import { unwrapList } from "../api/unwrap";

type SponsorAdsContextValue = {
  ads: SponsorAd[];
  current: SponsorAd | null;
  currentIndex: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SponsorAdsContext = createContext<SponsorAdsContextValue | null>(null);

export function SponsorAdsProvider({ children }: { children: ReactNode }) {
  const [ads, setAds] = useState<SponsorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<SponsorAd[] | Paginated<SponsorAd>>(
        "/anuncios/activos/",
        false,
      );
      const list = unwrapList(data);
      setAds(list.filter((a) => a.media_url));
      setCurrentIndex(0);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener("hospy:sponsor-ads-refresh", onRefresh);
    return () => window.removeEventListener("hospy:sponsor-ads-refresh", onRefresh);
  }, [refresh]);

  const current = ads.length > 0 ? ads[currentIndex % ads.length] : null;

  useEffect(() => {
    if (ads.length <= 1) return;
    const sec = Math.min(Math.max(current?.duration_seconds ?? 5, 1), 10);
    const timer = window.setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % ads.length);
    }, sec * 1000);
    return () => window.clearTimeout(timer);
  }, [ads.length, currentIndex, current?.duration_seconds, current?.id]);

  const value = useMemo(
    () => ({ ads, current, currentIndex, loading, refresh }),
    [ads, current, currentIndex, loading, refresh],
  );

  return (
    <SponsorAdsContext.Provider value={value}>{children}</SponsorAdsContext.Provider>
  );
}

export function useSponsorAds() {
  const ctx = useContext(SponsorAdsContext);
  if (!ctx) throw new Error("useSponsorAds debe usarse dentro de SponsorAdsProvider");
  return ctx;
}
