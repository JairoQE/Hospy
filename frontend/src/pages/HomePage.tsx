import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { api, buildQuery } from "../api/client";

import type { AccommodationListItem, BrowseTile, Paginated } from "../api/types";

import { BrowseTilesSection } from "../components/home/BrowseTilesSection";

import { GeoLocationBanner } from "../components/home/GeoLocationBanner";

import { HomeHero } from "../components/home/HomeHero";

import {

  LocationExplorer,

  type UbigeoItem,

} from "../components/home/LocationExplorer";

import { NearbySection } from "../components/home/NearbySection";

import { RecentlyViewedSection } from "../components/home/RecentlyViewedSection";

import { SearchResultsSection } from "../components/home/SearchResultsSection";

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
import { fetchDistrictCatalogForSearch } from "../utils/fetchDistrictCatalog";



const NEARBY_RADIUS_KM = 25;

function initialHomeTilesState(): {
  typeTiles: BrowseTile[];
  regionTiles: BrowseTile[];
  departmentTiles: BrowseTile[];
  tilesLoading: boolean;
} {
  const cached = loadCachedHomeBootstrap();
  if (!cached) {
    return {
      typeTiles: [],
      regionTiles: [],
      departmentTiles: [],
      tilesLoading: true,
    };
  }
  return {
    typeTiles: cached.tipo,
    regionTiles: cached.region,
    departmentTiles: mergeDepartmentTiles(
      cached.ubigeo_departamentos,
      cached.departamento,
    ),
    tilesLoading: false,
  };
}

type BrowseMeta = {

  label: string;

  zona?: string;

  departamento?: string;

  provincia?: string;

  distrito?: string;

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

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [filters, setFilters] = useState<SearchFilters | null>(null);

  const [districtCatalog, setDistrictCatalog] = useState<UbigeoItem[] | undefined>(undefined);

  const [districtCatalogLoading, setDistrictCatalogLoading] = useState(false);

  const [browse, setBrowse] = useState<BrowseMeta | null>(null);

  const [resultsTitle, setResultsTitle] = useState<string | null>(null);

  const [tileState, setTileState] = useState(initialHomeTilesState);
  const { typeTiles, regionTiles, departmentTiles, tilesLoading } = tileState;

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

    ) => {

      lastQueryRef.current = { query, title };

      setLoading(true);

      setError("");

      setResultsTitle(title);

      setItems([]);

      try {

        const q = buildQuery(query);

        const data = await api.get<Paginated<AccommodationListItem>>(

          `/hospedajes/${q}`,

          false,

        );

        setItems(data.results);

        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      } catch (e) {

        setError(e instanceof Error ? e.message : "Error al cargar");

        setItems([]);

      } finally {

        setLoading(false);

      }

    },

    [],

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
    }) => {
      setTileState({
        typeTiles: payload.tipo,
        regionTiles: payload.region,
        departmentTiles: mergeDepartmentTiles(
          payload.ubigeo_departamentos,
          payload.departamento,
        ),
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
        ordenar: f.ordenar,
        departamento: f.departamento,
        provincia: f.provincia,
        distrito: f.distrito,
      },
      placeLabel
        ? tVars("home.resultsInPlace", { place: placeLabel })
        : t("home.resultsSearch"),
    );
  };



  const onBrowseType = (tipo: string, label: string) => {

    setFilters(null);

    setBrowse({ label });

    loadList({ tipo, ordenar: "-rating" }, label);

  };



  const onBrowseZona = (zona: string, label: string) => {

    setFilters(null);

    setBrowse({ label, zona });

    loadList({ zona, ordenar: "-rating" }, tVars("home.staysInRegion", { region: label }));
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

      },

      tVars("home.staysInPlace", { place: params.label }),
    );
  };



  const clearResults = () => {

    setFilters(null);

    setBrowse(null);

    setResultsTitle(null);

    setItems([]);

    setError("");

    setDistrictCatalog(undefined);

    setDistrictCatalogLoading(false);

    lastQueryRef.current = null;

  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("ofertas") === "1") {
      loadList({ ofertas: 1, ordenar: "-rating" }, t("home.offersTitle"));
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
    if (!groupResultsByDistrito || !filters) {
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

  const showBrowseSections = !filters && !browse && !resultsTitle;



  return (

    <div className="home-page home-page--v2">

      <HomeHero onSearch={onHeroSearch} geoStatus={geo.status} geoHint={geoHint} />



      <div className="container home-content">

        <GeoLocationBanner

          status={geo.status}

          onActivate={geo.request}

          onSkip={geo.skip}

        />



        {showBrowseSections && (

          <>

            <RecentlyViewedSection items={recentItems} />

            <div id="tipos">

              <BrowseTilesSection
                title={t("home.browseByType")}
                tiles={typeTilesI18n}
                loading={tilesLoading}
                onSelect={onBrowseTile}
              />
            </div>

            <BrowseTilesSection
              title={t("home.browseByRegion")}
              subtitle={t("home.browseByRegionSub")}
              tiles={regionTilesI18n}
              loading={tilesLoading}
              onSelect={onBrowseTile}
            />

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

          </>

        )}



        <section ref={resultsRef}>

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

          />

        </section>

      </div>



      <ScrollToTopButton />

    </div>

  );

}


