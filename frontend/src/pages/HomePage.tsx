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

import { mergeDepartmentTiles } from "../utils/departmentTiles";

import type { SearchFilters } from "../components/SearchBar";

import type { LocationSearchParams } from "../data/peruLocations";

import { useGeolocation } from "../hooks/useGeolocation";

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";



const NEARBY_RADIUS_KM = 25;



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

  const [browse, setBrowse] = useState<BrowseMeta | null>(null);

  const [resultsTitle, setResultsTitle] = useState<string | null>(null);

  const [typeTiles, setTypeTiles] = useState<BrowseTile[]>([]);

  const [regionTiles, setRegionTiles] = useState<BrowseTile[]>([]);

  const [departmentTiles, setDepartmentTiles] = useState<BrowseTile[]>([]);

  const [tilesLoading, setTilesLoading] = useState(true);



  const loadList = useCallback(

    async (

      query: Record<string, string | number | undefined | null>,

      title: string,

    ) => {

      lastQueryRef.current = { query, title };

      setLoading(true);

      setError("");

      setResultsTitle(title);

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



  useEffect(() => {

    setTilesLoading(true);

    Promise.all([

      api.get<BrowseTile[]>("/inicio-bloques/?group=tipo", false),

      api.get<BrowseTile[]>("/inicio-bloques/?group=region", false),

      api.get<BrowseTile[]>("/inicio-bloques/?group=departamento", false),

      api.get<UbigeoItem[]>("/ubigeo/departamentos/", false),

    ])

      .then(([tipo, region, departamentoAdmin, ubigeoDeptos]) => {

        setTypeTiles(Array.isArray(tipo) ? tipo : []);

        setRegionTiles(Array.isArray(region) ? region : []);

        const admin = Array.isArray(departamentoAdmin) ? departamentoAdmin : [];

        const deptos = Array.isArray(ubigeoDeptos) ? ubigeoDeptos : [];

        setDepartmentTiles(mergeDepartmentTiles(deptos, admin));

      })

      .catch(() => {})

      .finally(() => setTilesLoading(false));

  }, []);



  useEffect(() => {

    const id = location.hash.replace("#", "");

    if (!id) return;

    const t = window.setTimeout(() => {

      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    }, 120);

    return () => window.clearTimeout(t);

  }, [location.hash]);

  const geoHint = useMemo(() => {

    if (geo.status === "loading") return "Obteniendo tu ubicación…";

    if (geo.status === "error" && geo.errorMessage) return geo.errorMessage;

    if (geo.status === "prompt") {

      return "Activa tu ubicación en el banner de abajo para ver opciones cercanas.";

    }

    return null;

  }, [geo.status, geo.errorMessage]);



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
      placeLabel ? `Resultados en ${placeLabel}` : "Resultados de búsqueda",
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

    loadList({ zona, ordenar: "-rating" }, `Alojamientos en la ${label}`);

  };



  const onBrowseTile = (tile: BrowseTile) => {

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

      `Alojamientos en ${params.label}`,

    );

  };



  const clearResults = () => {

    setFilters(null);

    setBrowse(null);

    setResultsTitle(null);

    setItems([]);

    setError("");

    lastQueryRef.current = null;

  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("ofertas") === "1") {
      loadList({ ofertas: 1, ordenar: "-rating" }, "Hospedajes con oferta");
      return;
    }
    if (resultsTitle === "Hospedajes con oferta") {
      clearResults();
    }
  }, [location.search, loadList, resultsTitle]);

  const retrySearch = () => {

    const last = lastQueryRef.current;

    if (last) loadList(last.query, last.title);

  };



  const isOfertasView = useMemo(
    () => new URLSearchParams(location.search).get("ofertas") === "1",
    [location.search],
  );

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

                title="Busca por tipo de alojamiento"

                tiles={typeTiles}

                loading={tilesLoading}

                onSelect={onBrowseTile}

              />

            </div>

            <BrowseTilesSection

              title="Explora por región natural"

              subtitle="Costa, Sierra o Selva del Perú"

              tiles={regionTiles}

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


