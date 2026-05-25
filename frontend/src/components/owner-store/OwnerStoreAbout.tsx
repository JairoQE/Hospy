import { Link } from "react-router-dom";
import type { OwnerStoreProfile } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

type Props = {
  store: OwnerStoreProfile;
  ownerName: string;
};

export function OwnerStoreAbout({ store, ownerName }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const bio = store.bio?.trim();

  return (
    <section className="owner-store-about card-elevated">
      <h2 className="owner-store-section-title">
        {tVars("ownerStorePage.aboutTitle", { name: ownerName })}
      </h2>
      <p className="owner-store-about-text">
        {bio || tVars("ownerStorePage.aboutPlaceholder", { name: ownerName })}
      </p>

      <h3 className="owner-store-about-subtitle">{t("ownerStorePage.verifications")}</h3>
      <ul className="owner-store-verify-list">
        {store.email_verified && (
          <li>
            <PrimeIcon name="pi-check-circle" size={18} />
            {t("ownerStorePage.verifyEmail")}
          </li>
        )}
        {store.phone_verified && (
          <li>
            <PrimeIcon name="pi-check-circle" size={18} />
            {t("ownerStorePage.verifyPhone")}
          </li>
        )}
        {store.identity_verified && (
          <li>
            <PrimeIcon name="pi-check-circle" size={18} />
            {t("ownerStorePage.verifyIdentity")}
          </li>
        )}
      </ul>

      {(store.languages?.length ?? 0) > 0 && (
        <>
          <h3 className="owner-store-about-subtitle">{t("ownerStorePage.languages")}</h3>
          <p className="owner-store-languages">
            {(store.languages ?? []).map((lang) => (
              <span key={lang} className="owner-store-lang-chip">
                {lang}
              </span>
            ))}
          </p>
        </>
      )}

      <p className="owner-store-cta-soft">
        <Link to="/legal/terminos-y-condiciones" className="owner-store-text-link">
          {t("ownerStorePage.cancellationPolicy")}
        </Link>
      </p>
    </section>
  );
}
