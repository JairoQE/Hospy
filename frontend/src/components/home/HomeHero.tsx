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
    </section>
  );
}
