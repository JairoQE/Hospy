import { useState } from "react";
import { Bell, Apple } from "lucide-react";

import {
  appPromoUrl,
  appStoreUrl,
  googlePlayUrl,
  isAppPromoEnabled,
  qrCodeImageUrl,
} from "../../config/appPromo";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { HospyLogo } from "../brand/HospyLogo";
import { IconCheck } from "../icons";

function StoreBadgeGoogle({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="app-promo-store-badge app-promo-store-badge--google"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="app-promo-store-badge-icon" aria-hidden>
        ▶
      </span>
      <span className="app-promo-store-badge-text">
        <small>DISPONIBLE EN</small>
        <strong>Google Play</strong>
      </span>
    </a>
  );
}

function StoreBadgeApple({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="app-promo-store-badge app-promo-store-badge--apple"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="app-promo-store-badge-icon" aria-hidden>
        <Apple size={22} strokeWidth={2} />
      </span>
      <span className="app-promo-store-badge-text">
        <small>Descárgalo en el</small>
        <strong>App Store</strong>
      </span>
    </a>
  );
}

function PromoPhoneMockup() {
  const { t } = useLocaleCurrency();

  return (
    <div className="app-promo-phone" aria-hidden>
      <div className="app-promo-phone-shell">
        <div className="app-promo-phone-notch" />
        <div className="app-promo-phone-screen">
          <div className="app-promo-phone-header">
            <HospyLogo height={22} variant="full" className="app-promo-phone-logo" />
          </div>
          <div className="app-promo-phone-alert">
            <Bell size={16} strokeWidth={2.5} />
            <span>{t("home.appPromoPhoneAlert")}</span>
          </div>
          <div className="app-promo-phone-card">
            <div className="app-promo-phone-card-image" />
            <div className="app-promo-phone-card-caption">
              <strong>{t("home.appPromoPhoneHotel")}</strong>
              <span>★★★★</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppPromoBanner() {
  const { t } = useLocaleCurrency();
  const [qrFailed, setQrFailed] = useState(false);

  if (!isAppPromoEnabled()) return null;

  const promoUrl = appPromoUrl();
  const playUrl = googlePlayUrl();
  const iosUrl = appStoreUrl();
  const hasStoreLinks = Boolean(playUrl || iosUrl);

  const features = [
    t("home.appPromoFeature1"),
    t("home.appPromoFeature2"),
  ];

  return (
    <section
      className="home-block fade-in app-promo-banner"
      aria-labelledby="app-promo-title"
    >
      <div className="app-promo-banner-inner">
        <div className="app-promo-banner-copy">
          <h2 id="app-promo-title" className="app-promo-banner-title">
            {t("home.appPromoTitle")}
          </h2>

          <ul className="app-promo-features">
            {features.map((line) => (
              <li key={line}>
                <span className="app-promo-feature-icon" aria-hidden>
                  <IconCheck size={18} />
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="app-promo-cta-row">
            <a
              href={promoUrl}
              className="app-promo-qr-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("home.appPromoQrAria")}
            >
              {!qrFailed ? (
                <img
                  src={qrCodeImageUrl(promoUrl)}
                  alt=""
                  width={168}
                  height={168}
                  className="app-promo-qr-image"
                  loading="lazy"
                  decoding="async"
                  onError={() => setQrFailed(true)}
                />
              ) : (
                <span className="app-promo-qr-fallback">
                  <HospyLogo height={36} variant="mark" />
                  <span>{t("home.appPromoQrFallback")}</span>
                </span>
              )}
            </a>

            <div className="app-promo-stats">
              <div className="app-promo-stat">
                <strong>{t("home.appPromoStat1Value")}</strong>
                <span>{t("home.appPromoStat1Label")}</span>
              </div>
              <div className="app-promo-stat-divider" aria-hidden />
              <div className="app-promo-stat">
                <strong>{t("home.appPromoStat2Value")}</strong>
                <span>{t("home.appPromoStat2Label")}</span>
              </div>
            </div>
          </div>

          <div className="app-promo-stores">
            {playUrl && <StoreBadgeGoogle href={playUrl} />}
            {iosUrl && <StoreBadgeApple href={iosUrl} />}
            {!hasStoreLinks && (
              <a
                href={promoUrl}
                className="app-promo-web-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("home.appPromoWebCta")}
              </a>
            )}
          </div>
        </div>

        <PromoPhoneMockup />
      </div>
    </section>
  );
}
