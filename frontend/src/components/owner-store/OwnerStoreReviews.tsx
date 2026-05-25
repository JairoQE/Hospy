import { useState } from "react";
import type { OwnerReviewPreview } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { StarRating } from "../StarRating";
import { UserAvatar } from "../UserAvatar";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatDate } from "../../utils/format";

type Props = {
  ownerName: string;
  reviews: OwnerReviewPreview[];
  totalCount: number;
};

export function OwnerStoreReviews({ ownerName, reviews, totalCount }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, 3);

  return (
    <section className="owner-store-reviews card-elevated" id="owner-reviews">
      <h2 className="owner-store-section-title">
        {tVars("ownerStorePage.reviewsTitle", { name: ownerName })}
      </h2>

      {totalCount === 0 ? (
        <div className="owner-store-reviews-empty">
          <PrimeIcon name="pi-comment" size={32} />
          <p>{tVars("ownerStorePage.reviewsEmpty", { name: ownerName })}</p>
        </div>
      ) : (
        <>
          <ul className="owner-store-reviews-list">
            {visible.map((r) => (
              <li key={r.id} className="owner-store-review-item">
                <UserAvatar
                  user={{
                    first_name: r.author_name,
                    last_name: "",
                    email: r.author_name,
                    photo_url: r.author_photo_url,
                  }}
                  size="md"
                />
                <div className="owner-store-review-body">
                  <div className="owner-store-review-head">
                    <strong>{r.author_name}</strong>
                    <StarRating rating={r.rating} size="sm" showValue={false} />
                    <span className="muted">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="owner-store-review-acc muted">{r.accommodation_name}</p>
                  <p className="owner-store-review-comment">{r.comment}</p>
                </div>
              </li>
            ))}
          </ul>
          {reviews.length > 3 && !showAll && (
            <button
              type="button"
              className="btn owner-store-btn-outline"
              onClick={() => setShowAll(true)}
            >
              {t("ownerStorePage.reviewsSeeAll")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
