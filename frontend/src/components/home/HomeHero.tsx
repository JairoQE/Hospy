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
        {/* Ola única, dentro del mismo bloque del degradado (absolute bottom) */}
        <svg
          className="home-hero-wave"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="var(--bg)"
            d="M0,36 C180,68 360,12 540,36 C720,60 900,16 1080,40 C1260,64 1380,24 1440,40 L1440,80 L0,80 Z"
          />
        </svg>
      </div>
    </section>
  );
}
