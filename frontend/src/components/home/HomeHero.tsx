import type { GeolocationStatus } from "../../hooks/useGeolocation";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { useSiteDesign } from "../../context/SiteDesignContext";
import { HomeHeroSearch } from "./HomeHeroSearch";
import { HeroBackground, heroWaveAnimated } from "./HeroBackground";
import type { SearchFilters } from "../SearchBar";

type Props = {
  onSearch: (filters: SearchFilters) => void;
  geoStatus: GeolocationStatus;
  geoHint?: string | null;
};

export function HomeHero({ onSearch, geoStatus, geoHint }: Props) {
  const { t } = useLocaleCurrency();
  const { design } = useSiteDesign();
  const waveAnim = heroWaveAnimated(design.hero_animation_style, design.hero_animated);

  return (
    <section className="home-hero home-hero--v2" aria-labelledby="home-hero-title">
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
      <svg
        className={`home-hero-wave${waveAnim ? " is-animated" : ""}`}
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
