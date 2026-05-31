import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { persistChartStyle, subscribeChartStyleStorage } from "../utils/chartStyleStorage";
import { normalizeChartStyle } from "../components/charts/chartStyles";
import {
  DEFAULT_SITE_DESIGN,
  applySiteDesignToDocument,
  fetchSiteDesign,
  updateSiteDesign,
  type SiteDesignSettings,
} from "../api/siteDesign";

type Ctx = {
  design: SiteDesignSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (patch: Partial<SiteDesignSettings>) => Promise<SiteDesignSettings>;
};

const SiteDesignContext = createContext<Ctx | null>(null);

export function SiteDesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesign] = useState<SiteDesignSettings>(DEFAULT_SITE_DESIGN);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((settings: SiteDesignSettings) => {
    setDesign(settings);
    applySiteDesignToDocument(settings);
    persistChartStyle(normalizeChartStyle(settings.chart_style));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSiteDesign();
      apply({ ...DEFAULT_SITE_DESIGN, ...data });
    } catch {
      apply(DEFAULT_SITE_DESIGN);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeChartStyleStorage((style) => {
      setDesign((prev) => {
        if (prev.chart_style === style) return prev;
        const next = { ...prev, chart_style: style };
        applySiteDesignToDocument(next);
        return next;
      });
    });
  }, []);

  const save = useCallback(
    async (patch: Partial<SiteDesignSettings>) => {
      const updated = await updateSiteDesign(patch);
      apply(updated);
      return updated;
    },
    [apply],
  );

  const value = useMemo(
    () => ({ design, loading, refresh, save }),
    [design, loading, refresh, save],
  );

  return <SiteDesignContext.Provider value={value}>{children}</SiteDesignContext.Provider>;
}

export function useSiteDesign() {
  const ctx = useContext(SiteDesignContext);
  if (!ctx) throw new Error("useSiteDesign requiere SiteDesignProvider");
  return ctx;
}
