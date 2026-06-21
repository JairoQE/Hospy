import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { api, buildQuery } from "../api/client";

import type {
  AccommodationListItem,
  BrowseTile,
  FeaturedSearchItem,
  Paginated,
} from "../api/types";

import { BrowseTilesSection } from "../components/home/BrowseTilesSection";

import { GeoLocationBanner } from "../components/home/GeoLocationBanner";

import { HomeHero } from "../components/home/HomeHero";

import {

  LocationExplorer,

  type UbigeoItem,

} from "../components/home/LocationExplorer";

import { NearbySection } from "../components/home/NearbySection";

import { AppPromoBanner } from "../components/home/AppPromoBanner";

import { FeaturedSearchesSection } from "../components/home/FeaturedSearchesSection";
import { RecentlyViewedSection } from "../components/home/RecentlyViewedSection";

import { SearchResultsSection } from "../components/home/SearchResultsSection";
import type { ResultsToolbarValues } from "../components/home/SearchResultsToolbar";
import { DEFAULT_RESULTS_PAGE_SIZE } from "../utils/resultsPagination";

import { ScrollToTopButton } from "../components/ui/ScrollToTopButton";

import {
  fetchHomeBootstrap,
  loadCachedHomeBootstrap,
} from "../api/homeBootstrap";
import { recordBrowseTileClick } from "../api/browseTiles";

import type { SearchFilters } from "../components/SearchBar";

import type { LocationSearchParams } from "../data/peruLocations";

import { useGeolocation } from "../hooks/useGeolocation";

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { translateBrowseTiles } from "../utils/browseTileI18n";
import { mergeDepartmentTiles } from "../utils/departmentTiles";
import { applyTileStatsList, type TileStatsMap } from "../utils/tileStats";
import { fetchDistrictCatalogForSearch } from "../utils/fetchDistrictCatalog";



const NEARBY_RADIUS_KM = 25;

function initialHomeTilesState(): {
  typeTiles: BrowseTile[];
  regionTiles: BrowseTile[];
  departmentTiles: BrowseTile[];
  featuredCities: FeaturedSearchItem[];
  featuredDestinations: FeaturedSearchItem[];
  tileStats: TileStatsMap;
  tilesLoading: boolean;
} {
  const cached = loadCachedHomeBootstrap();
  if (!cached) {
    return {
      typeTiles: [],
      regionTiles: [],
      departmentTiles: [],
      featuredCities: [],
      featuredDestinations: [],
      tileStats: {},
      tilesLoading: true,
    };
  }
  const tileStats = cached.tile_stats ?? {};
  return {
    typeTiles: applyTileStatsList(cached.tipo, tileStats),
    regionTiles: applyTileStatsList(cached.region, tileStats),
    departmentTiles: applyTileStatsList(
      mergeDepartmentTiles(cached.ubigeo_departamentos, cached.departamento),
      tileStats,
    ),
    featuredCities: cached.busquedas_destacadas?.ciudades ?? [],
    featuredDestinations: cached.busquedas_destacadas?.destinos ?? [],
    tileStats,
    tilesLoading: false,
  };
}

type BrowseMeta = {
  label: string;
  zona?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  lockedTipo?: string;
};



export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, tVars, language } = useLocaleCurrency();

  const geo = useGeolocation();

  const { items: recentItems } = useRecentlyViewed();

  const resultsRef = useRef<HTMLElement>(null);

  const lastQueryRef = useRef<{

    query: Record<string, string | number | undefined | null>;

    title: string;

  } | null>(null);



  const [nearby, setNearby] = useState<AccommodationListItem[]>([]);

  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [items, setItems] = useState<AccommodationListItem[]>([]);

  const [listMeta, setListMeta] = useState<{
    count: number;
    page: number;
    pageSize: number;
  } | null>(null);

  const [activeQuery, setActiveQuery] = useState<
    Record<string, string | number | undefined | null> | null
  >(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [filters, setFilters] = useState<SearchFilters | null>(null);

  const [districtCatalog, setDistrictCatalog] = useState<UbigeoItem[] | undefined>(undefined);

  const [districtCatalogLoading, setDistrictCatalogLoading] = useState(false);

  const [browse, setBrowse] = useState<BrowseMeta | null>(null);

  const [resultsTitle, setResultsTitle] = useState<string | null>(null);

  const [tileState, setTileState] = useState(initialHomeTilesState);
  const {
    typeTiles,
    regionTiles,
    departmentTiles,
    featuredCities,
    featuredDestinations,
    tilesLoading,
  } = tileState;

  const typeTilesI18n = useMemo(
    () => translateBrowseTiles(typeTiles, language),
    [typeTiles, language],
  );
  const regionTilesI18n = useMemo(
    () => translateBrowseTiles(regionTiles, language),
    [regionTiles, language],
  );

  const loadList = useCallback(
    async (
      query: Record<string, string | number | undefined | null>,
      title: string,
      opts?: { scroll?: boolean },
    ) => {
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.max(
        1,
        Number(query.page_size) || DEFAULT_RESULTS_PAGE_SIZE,
      );
      const fullQuery = { ...query, page, page_size: pageSize };

      lastQueryRef.current = { query: fullQuery, title };
      setActiveQuery(fullQuery);
      setLoading(true);
      setError("");
      setResultsTitle(title);

      try {
        const q = buildQuery(fullQuery);
        const data = await api.get<Paginated<AccommodationListItem>>(
          `/hospedajes/${q}`,
          false,
        );
        setItems(data.results);
        setListMeta({ count: data.count, page, pageSize });
        if (opts?.scroll !== false) {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar");
        setItems([]);
        setListMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateResultsQuery = useCallback(
    (patch: Partial<ResultsToolbarValues>, resetPage = true) => {
      const last = lastQueryRef.current;
      if (!last) return;
      const next: Record<string, string | number | undefined | null> = {
        ...last.query,
      };
      if (patch.search !== undefined) {
        next.search = patch.search.trim() || undefined;
      }
      if (patch.ordenar !== undefined) next.ordenar = patch.ordenar;
      if (patch.tipo !== undefined) next.tipo = patch.tipo || undefined;
      if (patch.precio_min !== undefined) {
        next.precio_min = patch.precio_min || undefined;
      }
      if (patch.precio_max !== undefined) {
        next.precio_max = patch.precio_max || undefined;
      }
      if (patch.page_size !== undefined) next.page_size = patch.page_size;
      if (resetPage) next.page = 1;
      loadList(next, last.title, { scroll: false });
    },
    [loadList],
  );

  const goToResultsPage = useCallback(
    (page: number) => {
      const last = lastQueryRef.current;
      if (!last) return;
      loadList({ ...last.query, page }, last.title, { scroll: true });
    },
    [loadList],
  );



  const loadNearby = useCallback(async (lat: number, lng: number) => {

    setNearbyLoading(true);

    try {

      const q = buildQuery({ lat, lng, radio_km: NEARBY_RADIUS_KM });

      const data = await api.get<AccommodationListItem[]>(

        `/hospedajes/cercanos${q}`,

        false,

      );

      setNearby(Array.isArray(data) ? data : []);

    } catch {

      setNearby([]);

    } finally {

      setNearbyLoading(false);

    }

  }, []);



  useEffect(() => {

    if (geo.status === "granted" && geo.coords) {

      loadNearby(geo.coords.lat, geo.coords.lng);

    } else {

      setNearby([]);

    }

  }, [geo.status, geo.coords, loadNearby]);



  const applyHomeBootstrap = useCallback(
    (payload: {
      tipo: BrowseTile[];
      region: BrowseTile[];
      departamento: BrowseTile[];
      ubigeo_departamentos: UbigeoItem[];
      busquedas_destacadas?: {
        ciudades: FeaturedSearchItem[];
        destinos: FeaturedSearchItem[];
      };
      tile_stats?: TileStatsMap;
    }) => {
      const tileStats = payload.tile_stats ?? {};
      setTileState({
        typeTiles: applyTileStatsList(payload.tipo, tileStats),
        regionTiles: applyTileStatsList(payload.region, tileStats),
        departmentTiles: applyTileStatsList(
          mergeDepartmentTiles(
            payload.ubigeo_departamentos,
            payload.departamento,
          ),
          tileStats,
        ),
        featuredCities: payload.busquedas_destacadas?.ciudades ?? [],
        featuredDestinations: payload.busquedas_destacadas?.destinos ?? [],
        tileStats,
        tilesLoading: false,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const cached = loadCachedHomeBootstrap();
    if (!cached) {
      setTileState((prev) => ({ ...prev, tilesLoading: true }));
    }

    fetchHomeBootstrap()
      .then((payload) => {
        if (cancelled) return;
        applyHomeBootstrap(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setTileState((prev) => ({ ...prev, tilesLoading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyHomeBootstrap]);



  useEffect(() => {

    const id = location.hash.replace("#", "");

    if (!id) return;

    const t = window.setTimeout(() => {

      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    }, 120);

    return () => window.clearTimeout(t);

  }, [location.hash]);

  const geoHint = useMemo(() => {
    if (geo.status === "loading") return t("home.geoLoading");
    if (geo.status === "error" && geo.errorMessage) return geo.errorMessage;
    if (geo.status === "prompt") return t("home.geoPrompt");
    return null;
  }, [geo.status, geo.errorMessage, t]);



  const onHeroSearch = (f: SearchFilters) => {

    setFilters(f);

    setBrowse(null);

    const placeLabel =
      f.ciudad || f.distrito || f.provincia || f.departamento || "";

    loadList(
      {
        ciudad: f.ciudad,
        entrada: f.entrada,
        salida: f.salida,
        tipo: f.tipo,
        precio_max: f.precio_max,
        precio_min: f.precio_min,
        ordenar: f.ordenar || "-rating",
        departamento: f.departamento,
        provincia: f.provincia,
        distrito: f.distrito,
        page: 1,
        page_size: DEFAULT_RESULTS_PAGE_SIZE,
      },
      placeLabel
        ? tVars("home.resultsInPlace", { place: placeLabel })
        : t("home.resultsSearch"),
    );
  };



  const onBrowseType = (tipo: string, label: string) => {
    setFilters(null);
    setBrowse({ label, lockedTipo: tipo });
    loadList(
      { tipo, ordenar: "-rating", page: 1, page_size: DEFAULT_RESULTS_PAGE_SIZE },
      label,
    );
  };



  const onBrowseZona = (zona: string, label: string) => {

    setFilters(null);

    setBrowse({ label, zona });
    loadList(
      { zona, ordenar: "-rating", page: 1, page_size: DEFAULT_RESULTS_PAGE_SIZE },
      tVars("home.staysInRegion", { region: label }),
    );
  };



  const onBrowseTile = (tile: BrowseTile) => {
    void recordBrowseTileClick(tile.id).catch(() => {});

    if (tile.group === "tipo") {

      onBrowseType(tile.filter_value, tile.title);

    } else {

      onBrowseZona(tile.filter_value, tile.title);

    }

  };



  const onBrowseLocation = (params: LocationSearchParams) => {

    setFilters(null);

    setBrowse({

      label: params.label,

      departamento: params.departamento,

      provincia: params.provincia,

      distrito: params.distrito,

    });

    loadList(
      {
        ciudad: params.ciudad,
        departamento: params.departamento,
        provincia: params.provincia,
        distrito: params.distrito,
        ordenar: "-rating",
        page: 1,
        page_size: DEFAULT_RESULTS_PAGE_SIZE,
      },

      tVars("home.staysInPlace", { place: params.label }),
    );
  };



  const onFeaturedSearch = (item: FeaturedSearchItem) => {
    if (item.tile_id) {
      void recordBrowseTileClick(item.tile_id).catch(() => {});
    }

    const query = {
      ciudad: item.search.ciudad,
      departamento: item.search.departamento,
      provincia: item.search.provincia,
      distrito: item.search.distrito,
      zona: item.search.zona,
      ordenar: "-rating",
      page: 1,
      page_size: DEFAULT_RESULTS_PAGE_SIZE,
    };

    setFilters({
      ciudad: item.search.ciudad ?? "",
      departamento: item.search.departamento ?? "",
      provincia: item.search.provincia ?? "",
      distrito: item.search.distrito ?? "",
      entrada: "",
      salida: "",
      tipo: "",
      precio_min: "",
      precio_max: "",
      ordenar: "-rating",
    });

    setBrowse({
      label: item.name,
      zona: item.search.zona,
      departamento: item.search.departamento,
      provincia: item.search.provincia,
      distrito: item.search.distrito,
    });

    loadList(
      query,
      item.search.zona
        ? tVars("home.staysInRegion", { region: item.name })
        : tVars("home.staysInPlace", { place: item.name }),
    );
  };



  const clearResults = () => {
    setFilters(null);
    setBrowse(null);
    setResultsTitle(null);
    setItems([]);
    setListMeta(null);
    setActiveQuery(null);
    setError("");

    setDistrictCatalog(undefined);

    setDistrictCatalogLoading(false);

    lastQueryRef.current = null;

  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("ofertas") === "1") {
      loadList(
        { ofertas: 1, ordenar: "-rating", page: 1, page_size: DEFAULT_RESULTS_PAGE_SIZE },
        t("home.offersTitle"),
      );
      return;
    }
    if (lastQueryRef.current?.query.ofertas === 1) {
      clearResults();
    }
  }, [location.search, loadList, t]);

  const retrySearch = () => {

    const last = lastQueryRef.current;

    if (last) loadList(last.query, last.title);

  };



  const isOfertasView = useMemo(
    () => new URLSearchParams(location.search).get("ofertas") === "1",
    [location.search],
  );

  /** Departamento, provincia o destino amplio: mostrar resultados por distrito (campo city / UBIGEO). */
  const groupResultsByDistrito = useMemo(() => {
    if (!filters) return false;
    if ((filters.distrito ?? "").trim()) return false;
    return !!(
      filters.departamento?.trim() ||
      filters.provincia?.trim() ||
      filters.ciudad?.trim()
    );
  }, [filters]);

  useEffect(() => {
    const shouldLoadCatalog =
      groupResultsByDistrito && Boolean((filters?.provincia ?? "").trim());
    if (!shouldLoadCatalog || !filters) {
      setDistrictCatalog(undefined);
      setDistrictCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setDistrictCatalog(undefined);
    setDistrictCatalogLoading(true);
    fetchDistrictCatalogForSearch(filters)
      .then((rows) => {
        if (!cancelled) setDistrictCatalog(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setDistrictCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setDistrictCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    groupResultsByDistrito,
    filters?.departamento,
    filters?.provincia,
    filters?.ciudad,
    filters?.distrito,
  ]);

  const backToHome = () => {
    clearResults();
    navigate("/", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toolbarValues = useMemo((): ResultsToolbarValues | null => {
    if (!activeQuery) return null;
    return {
      search: String(activeQuery.search ?? ""),
      ordenar: String(activeQuery.ordenar ?? "-rating"),
      tipo: String(activeQuery.tipo ?? browse?.lockedTipo ?? ""),
      precio_min: String(activeQuery.precio_min ?? ""),
      precio_max: String(activeQuery.precio_max ?? ""),
      page_size: Number(activeQuery.page_size) || DEFAULT_RESULTS_PAGE_SIZE,
    };
  }, [activeQuery, browse?.lockedTipo]);

  const showBrowseSections = !filters && !browse && !resultsTitle;



  return (

    <div className="home-page home-page--v2">

      <HomeHero onSearch={onHeroSearch} geoStatus={geo.status} geoHint={geoHint} />



      <div className="container home-content">

        {showBrowseSections && (
          <GeoLocationBanner
            status={geo.status}
            onActivate={geo.request}
            onSkip={geo.skip}
          />
        )}



        {showBrowseSections && (

          <>

            <FeaturedSearchesSection
              cities={featuredCities}
              destinations={featuredDestinations}
              loading={tilesLoading}
              onSelect={onFeaturedSearch}
            />

            <RecentlyViewedSection items={recentItems} />

            <div id="tipos" data-tour="home-browse-types">

              <BrowseTilesSection
                title={t("home.browseByType")}
                tiles={typeTilesI18n}
                loading={tilesLoading}
                onSelect={onBrowseTile}
              />
            </div>

            <div data-tour="home-browse-regions">
              <BrowseTilesSection
                title={t("home.browseByRegion")}
                subtitle={t("home.browseByRegionSub")}
                tiles={regionTilesI18n}
                loading={tilesLoading}
                onSelect={onBrowseTile}
              />
            </div>

            <div id="destinos">

              <LocationExplorer

                departmentTiles={departmentTiles}

                departmentsLoading={tilesLoading}

                onSelect={onBrowseLocation}

              />

            </div>



            {geo.status === "granted" && (

              <NearbySection

                items={nearby}

                loading={nearbyLoading}

                radiusKm={NEARBY_RADIUS_KM}

              />

            )}

            <AppPromoBanner />

          </>

        )}



        <section ref={resultsRef} data-tour="home-results">

          <SearchResultsSection
            title={resultsTitle}
            items={items}
            loading={loading}
            error={error}
            filters={filters}
            hasBrowse={Boolean(browse)}
            groupByDistrito={groupResultsByDistrito}
            districtCatalog={districtCatalog}
            districtCatalogLoading={districtCatalogLoading}
            showBackToHome={isOfertasView}
            onBackToHome={backToHome}
            onClear={clearResults}
            onRetry={retrySearch}
            listMeta={listMeta}
            toolbarValues={toolbarValues}
            lockedTipo={browse?.lockedTipo}
            onToolbarApply={updateResultsQuery}
            onPageChange={goToResultsPage}
          />

        </section>

      </div>



      <ScrollToTopButton />

    </div>

  );

}


