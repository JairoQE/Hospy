import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Search, Sparkles } from "lucide-react";

import { isAppPromoEnabled } from "../../config/appPromo";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { HospyLogo } from "../brand/HospyLogo";
import { IconCheck } from "../icons";

function PromoWebShowcase() {
  const { t } = useLocaleCurrency();

  return (
    <div className="app-promo-showcase" aria-hidden>
      <div className="app-promo-showcase-orbit app-promo-showcase-orbit--a" />
      <div className="app-promo-showcase-orbit app-promo-showcase-orbit--b" />
      <div className="app-promo-showcase-orbit app-promo-showcase-orbit--c" />

      <div className="app-promo-browser">
        <div className="app-promo-browser-chrome">
          <span className="app-promo-browser-dot" />
          <span className="app-promo-browser-dot" />
          <span className="app-promo-browser-dot" />
          <span className="app-promo-browser-url">hospy.pe</span>
        </div>
        <div className="app-promo-browser-body">
          <HospyLogo height={24} variant="full" className="app-promo-browser-logo" />
          <div className="app-promo-browser-search">
            <Search size={15} strokeWidth={2.5} />
            <span>{t("home.appPromoSearchHint")}</span>
          </div>
          <div className="app-promo-browser-grid">
            <div className="app-promo-browser-card app-promo-browser-card--1" />
            <div className="app-promo-browser-card app-promo-browser-card--2" />
            <div className="app-promo-browser-card app-promo-browser-card--3" />
          </div>
        </div>
      </div>

      <div className="app-promo-float-card app-promo-float-card--offer">
        <Sparkles size={15} strokeWidth={2.5} />
        <span>{t("home.appPromoFloatOffer")}</span>
      </div>
      <div className="app-promo-float-card app-promo-float-card--place">
        <MapPin size={15} strokeWidth={2.5} />
        <span>{t("home.appPromoFloatPlace")}</span>
      </div>
      <div className="app-promo-float-card app-promo-float-card--chat">
        <MessageCircle size={15} strokeWidth={2.5} />
        <span>{t("home.appPromoFloatChat")}</span>
      </div>
    </div>
  );
}

export function AppPromoBanner() {
  const { t } = useLocaleCurrency();

  if (!isAppPromoEnabled()) return null;

  const features = [
    t("home.appPromoFeature1"),
    t("home.appPromoFeature2"),
    t("home.appPromoFeature3"),
  ];

  return (
    <section
      className="home-block fade-in app-promo-banner"
      aria-labelledby="app-promo-title"
    >
      <div className="app-promo-banner-inner">
        <div className="app-promo-banner-copy">
          <p className="app-promo-eyebrow">{t("home.appPromoEyebrow")}</p>
          <h2 id="app-promo-title" className="app-promo-banner-title">
            {t("home.appPromoTitle")}
          </h2>

          <ul className="app-promo-features">
            {features.map((line, index) => (
              <li
                key={line}
                className="app-promo-feature-item"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <span className="app-promo-feature-icon" aria-hidden>
                  <IconCheck size={18} />
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="app-promo-stats app-promo-stats--inline">
            <div className="app-promo-stat app-promo-stat--pulse">
              <strong>{t("home.appPromoStat1Value")}</strong>
              <span>{t("home.appPromoStat1Label")}</span>
            </div>
            <div className="app-promo-stat-divider" aria-hidden />
            <div className="app-promo-stat app-promo-stat--pulse">
              <strong>{t("home.appPromoStat2Value")}</strong>
              <span>{t("home.appPromoStat2Label")}</span>
            </div>
          </div>

          <div className="app-promo-actions">
            <Link to="/#destinos" className="app-promo-primary-btn">
              {t("home.appPromoCtaExplore")}
            </Link>
            <Link to="/?ofertas=1" className="app-promo-secondary-btn">
              {t("home.appPromoCtaOffers")}
            </Link>
          </div>
        </div>

        <PromoWebShowcase />
      </div>
    </section>
  );
}
