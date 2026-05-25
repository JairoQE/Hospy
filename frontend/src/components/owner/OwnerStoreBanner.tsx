import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import type { AccommodationDetail } from "../../api/types";
import { StarRating } from "../StarRating";
import { UserAvatar } from "../UserAvatar";
import { PrimeIcon } from "../PrimeIcon";
import { roleProfileLabelI18nKey, roleProfileVisitI18nKey } from "../../utils/format";

type Props = {
  accommodation: AccommodationDetail;
};

export function OwnerStoreBanner({ accommodation }: Props) {
  const { user } = useAuth();
  const { t, tVars } = useLocaleCurrency();
  const ownerId = accommodation.propietario_id;
  if (!ownerId) return null;

  const ownerName = accommodation.propietario_nombre || t("detail.hostDefault");
  const bio = accommodation.propietario_bio?.trim();
  const rating = Number(accommodation.propietario_calificacion) || 0;
  const reviews = accommodation.propietario_resenas_total ?? 0;
  const followers = accommodation.propietario_seguidores ?? 0;
  const profileUrl = `/anfitrion/${ownerId}`;
  const isSelf = user?.id === ownerId;

  const avatarUser = {
    first_name: ownerName,
    last_name: "",
    email: ownerName,
    photo_url: accommodation.propietario_foto_url,
  };

  return (
    <section className="property-section owner-store-banner" id="propietario-tienda">
      <Link to={profileUrl} className="owner-store-banner-link">
        <div className="owner-store-banner-inner">
          <UserAvatar user={avatarUser} size="lg" className="owner-store-avatar" />
          <div className="owner-store-banner-body">
            <p className="owner-store-label">{t(roleProfileLabelI18nKey("propietario"))}</p>
            <h3 className="owner-store-name">{ownerName}</h3>
            {bio && <p className="owner-store-bio">{bio}</p>}
            <div className="owner-store-meta">
              <StarRating rating={rating} size="sm" />
              <span className="owner-store-meta-item">
                {tVars("ownerStore.reviews", { count: reviews })}
              </span>
              <span className="owner-store-meta-item">
                {tVars("ownerStore.followers", { count: followers })}
              </span>
            </div>
          </div>
          <span className="owner-store-cta">
            {t(roleProfileVisitI18nKey("propietario"))}
            <PrimeIcon name="pi-angle-right" size={16} />
          </span>
        </div>
      </Link>
      {!isSelf && (
        <p className="muted owner-store-hint">{t("ownerStore.hint")}</p>
      )}
    </section>
  );
}
