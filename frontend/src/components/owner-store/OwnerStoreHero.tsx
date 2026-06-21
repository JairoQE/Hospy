import { Link } from "react-router-dom";
import type { OwnerStoreProfile } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { StarRating } from "../StarRating";
import { UserAvatar } from "../UserAvatar";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { resolveMediaUrl } from "../../utils/media";

type Props = {
  store: OwnerStoreProfile;
  ownerName: string;
  isSelf: boolean;
  followLoading: boolean;
  contactHint?: string;
  onFollow: () => void;
  onContact: () => void;
  onShare: () => void;
  onFollowersClick?: () => void;
  me: { id: number; role?: string } | null;
};

export function OwnerStoreHero({
  store,
  ownerName,
  isSelf,
  followLoading,
  contactHint,
  onFollow,
  onContact,
  onShare,
  onFollowersClick,
  me,
}: Props) {
  const { t } = useLocaleCurrency();
  const rating = store.owner_average_rating ?? 0;
  const reviews = store.owner_reviews_count ?? 0;
  const count = store.accommodations_count ?? 0;
  const coverUrl = resolveMediaUrl(store.cover_photo_url);

  return (
    <section className="owner-store-hero card-elevated">
      {coverUrl && (
        <div
          className="owner-store-hero-cover"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden
        />
      )}
      <div className="owner-store-hero-inner">
        <div className="owner-store-hero-main">
          <UserAvatar user={store} size="xl" className="owner-store-hero-avatar" />
          <div className="owner-store-hero-info">
            <h1 className="owner-store-hero-name">{ownerName}</h1>
            <div className="owner-store-badges">
              {store.identity_verified && (
                <span className="owner-store-badge-pill owner-store-badge-pill--verified">
                  <PrimeIcon name="pi-check-circle" size={14} />
                  {t("ownerStorePage.badgeVerified")}
                </span>
              )}
              {store.is_superhost && (
                <span className="owner-store-badge-pill owner-store-badge-pill--super">
                  <PrimeIcon name="pi-star" size={14} />
                  {t("ownerStorePage.badgeSuperhost")}
                </span>
              )}
              {store.responds_fast && (
                <span className="owner-store-badge-pill owner-store-badge-pill--fast">
                  <PrimeIcon name="pi-clock" size={14} />
                  {t("ownerStorePage.badgeFast")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="owner-store-metrics">
          <div className="owner-store-metric">
            {rating > 0 ? (
              <StarRating rating={rating} size="sm" showValue />
            ) : (
              <span className="owner-store-metric-muted">{t("ownerStorePage.noRatingsYet")}</span>
            )}
            <span className="owner-store-metric-label">{t("ownerStorePage.metricRating")}</span>
          </div>
          <a href="#owner-reviews" className="owner-store-metric owner-store-metric--link">
            <strong>{reviews}</strong>
            <span className="owner-store-metric-label">{t("ownerStorePage.metricReviews")}</span>
          </a>
          <button
            type="button"
            className="owner-store-metric owner-store-metric--clickable"
            onClick={onFollowersClick}
          >
            <strong>{store.followers_count}</strong>
            <span className="owner-store-metric-label">{t("ownerStorePage.metricFollowers")}</span>
          </button>
          <div className="owner-store-metric">
            <strong>{count}</strong>
            <span className="owner-store-metric-label">{t("ownerStorePage.metricProperties")}</span>
          </div>
          <div className="owner-store-metric">
            <strong>{store.response_time_label ?? "< 1 h"}</strong>
            <span className="owner-store-metric-label">{t("ownerStorePage.metricResponse")}</span>
          </div>
        </div>

        <div className="owner-store-hero-actions">
          {isSelf ? (
            <Link to="/panel" className="btn btn-primary">
              <PrimeIcon name="pi-home" size={16} />
              {t("ownerStorePage.manage")}
            </Link>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={onContact}>
                <PrimeIcon name="pi-comments" size={16} />
                {t("ownerStorePage.contact")}
              </button>
              {me ? (
                <button
                  type="button"
                  className={`btn owner-store-btn-outline${store.is_following ? " is-active" : ""}`}
                  disabled={followLoading}
                  onClick={onFollow}
                >
                  <PrimeIcon
                    name={store.is_following ? "pi-heart-fill" : "pi-heart"}
                    size={16}
                  />
                  {followLoading
                    ? "…"
                    : store.is_following
                      ? t("ownerStorePage.following")
                      : t("ownerStorePage.follow")}
                </button>
              ) : (
                <Link to="/login" className="btn owner-store-btn-outline">
                  <PrimeIcon name="pi-heart" size={16} />
                  {t("ownerStorePage.follow")}
                </Link>
              )}
              <button type="button" className="btn owner-store-btn-ghost" onClick={onShare}>
                <PrimeIcon name="pi-share-alt" size={16} />
                {t("ownerStorePage.share")}
              </button>
            </>
          )}
        </div>

        {contactHint && (
          <p className="owner-store-contact-hint error-msg" role="alert">
            {contactHint}
          </p>
        )}

        <p className="owner-store-trust-line">
          <PrimeIcon name="pi-shield" size={16} />
          {t("ownerStorePage.qualityCommitment")}
        </p>
      </div>
    </section>
  );
}
