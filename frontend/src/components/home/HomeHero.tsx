import type { GeolocationStatus } from "../../hooks/useGeolocation";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { HomeHeroSearch } from "./HomeHeroSearch";
import { HeroBackground } from "./HeroBackground";
import type { SearchFilters } from "../SearchBar";

type Props = {
  onSearch: (filters: SearchFilters) => void;
  geoStatus: GeolocationStatus;
  geoHint?: string | null;
};

export function HomeHero({ onSearch, geoStatus, geoHint }: Props) {
  const { t } = useLocaleCurrency();

  return (
    <section className="home-hero home-hero--v2" aria-labelledby="home-hero-title" data-tour="home-hero">
      {/* Fondo solo aquí: no se extiende debajo de la ola */}
      <div className="home-hero-main">
        <HeroBackground />
        <div className="container home-hero-inner">
          <h1 id="home-hero-title" className="home-hero-title">
            {t("home.heroTitle")}{" "}
            <span className="home-hero-highlight">{t("home.heroHighlight")}</span>
          </h1>
          <p className="home-hero-sub">{t("home.heroSub")}</p>
          <HomeHeroSearch onSearch={onSearch} />
          {geoHint && (geoStatus === "prompt" || geoStatus === "loading" || geoStatus === "error") && (
            <p className="home-hero-geo-hint" role="status">
              {geoHint}
            </p>
          )}
        </div>
      </div>
      {/* Única ola de cierre; hermana del bloque con degradado */}
      <svg
        className="home-hero-wave"
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="var(--bg)"
          d="M0,28 C240,56 480,4 720,28 C960,52 1200,8 1440,32 L1440,64 L0,64 Z"
        />
      </svg>
    </section>
  );
}
