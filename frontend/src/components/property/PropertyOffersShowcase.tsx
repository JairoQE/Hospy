import type { AccommodationOffer } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatDate, formatMoney, roomTypeLabel } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import "../../styles/property-offers.css";

type Props = {
  offers: AccommodationOffer[];
  maxDiscountPercent?: number | null;
  priceFrom?: number | null;
  priceFromOriginal?: number | null;
  onViewPrices?: () => void;
};

function discountLabel(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

export function PropertyOffersShowcase({
  offers,
  maxDiscountPercent,
  priceFrom,
  priceFromOriginal,
  onViewPrices,
}: Props) {
  const { t, tVars, language } = useLocaleCurrency();

  if (!offers.length) return null;

  const headlineDiscount =
    maxDiscountPercent ??
    Math.max(...offers.map((o) => Number(o.discount_percent) || 0));

  return (
    <section className="property-offers-showcase" aria-labelledby="property-offers-title">
      <div className="property-offers-showcase-glow" aria-hidden />
      <div className="property-offers-showcase-inner">
        <div className="property-offers-showcase-hero">
          <div className="property-offers-discount-ring" aria-hidden>
            <span className="property-offers-discount-value">-{discountLabel(headlineDiscount)}%</span>
            <span className="property-offers-discount-label">OFF</span>
          </div>

          <div className="property-offers-showcase-copy">
            <p className="property-offers-eyebrow">
              <PrimeIcon name="pi-bolt" size={14} />
              {t("detail.offersEyebrow")}
            </p>
            <h2 id="property-offers-title">{t("detail.offersTitle")}</h2>
            <p className="property-offers-sub">{t("detail.offersSubtitle")}</p>
            {priceFrom != null && priceFromOriginal != null && priceFromOriginal > priceFrom && (
              <p className="property-offers-price-preview">
                <span className="property-offers-price-old">
                  {formatMoney(priceFromOriginal, { language })}
                </span>
                <span className="property-offers-price-new">
                  {formatMoney(priceFrom, { language })}
                </span>
                <span className="property-offers-price-unit">{t("price.perNight")}</span>
              </p>
            )}
          </div>

          {onViewPrices && (
            <button type="button" className="btn btn-light property-offers-cta" onClick={onViewPrices}>
              {t("detail.viewOfferPrices")}
              <PrimeIcon name="pi-arrow-down" size={14} />
            </button>
          )}
        </div>

        <ul className="property-offers-cards">
          {offers.map((offer) => {
            const pct = discountLabel(offer.discount_percent);
            const title = offer.title?.trim() || tVars("detail.offerDefaultTitle", { percent: pct });
            const roomLabels = offer.rooms.map((r) =>
              tVars("detail.offerRoom", { n: r.number, type: roomTypeLabel(r.type) }),
            );

            return (
              <li key={offer.id} className="property-offer-card">
                <div className="property-offer-card-badge">-{pct}%</div>
                <div className="property-offer-card-body">
                  <strong>{title}</strong>
                  <p className="property-offer-card-dates">
                    {formatDate(offer.start_date, { language })} → {formatDate(offer.end_date, { language })}
                  </p>
                  {offer.dias_restantes > 0 && (
                    <p className="property-offer-card-countdown">
                      <PrimeIcon name="pi-clock" size={13} />
                      {tVars("detail.offerDaysLeft", { days: offer.dias_restantes })}
                    </p>
                  )}
                  {roomLabels.length > 0 && (
                    <div className="property-offer-card-rooms">
                      {roomLabels.map((label) => (
                        <span key={label} className="property-offer-room-chip">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
