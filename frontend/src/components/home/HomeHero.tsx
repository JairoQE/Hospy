import type { GeolocationStatus } from "../../hooks/useGeolocation";
import { HomeHeroSearch } from "./HomeHeroSearch";
import type { SearchFilters } from "../SearchBar";

type Props = {
  onSearch: (filters: SearchFilters) => void;
  geoStatus: GeolocationStatus;
  geoHint?: string | null;
};

export function HomeHero({ onSearch, geoStatus, geoHint }: Props) {
  return (
    <section className="home-hero home-hero--v2" aria-labelledby="home-hero-title">
      <div className="home-hero-bg" aria-hidden />
      <div className="container home-hero-inner">
        <h1 id="home-hero-title" className="home-hero-title">
          Encuentra tu próxima <span className="home-hero-highlight">estancia</span>
        </h1>
        <p className="home-hero-sub">
          Busca hoteles, hostales y hospedajes verificados en todo el Perú
        </p>
        <HomeHeroSearch onSearch={onSearch} />
        {geoHint && (geoStatus === "prompt" || geoStatus === "loading" || geoStatus === "error") && (
          <p className="home-hero-geo-hint" role="status">
            {geoHint}
          </p>
        )}
      </div>
      <svg
        className="home-hero-wave"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="var(--bg)"
          d="M0,48 C320,96 480,0 720,32 C960,64 1120,16 1440,40 L1440,80 L0,80 Z"
        />
      </svg>
    </section>
  );
}
