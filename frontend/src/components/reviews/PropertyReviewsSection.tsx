import { useMemo, useState } from "react";
import type { Review, ReviewInsights } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import {
  REVIEW_CATEGORY_KEYS,
  categoryLabelKey,
  distributionLabelKey,
  type ReviewCategoryKey,
  type ReviewDistributionKey,
} from "../../utils/reviewCategories";
import { formatDate } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import { StarRating } from "../StarRating";
import { ReviewStayMeta } from "./ReviewStayMeta";
import "../../styles/reviews-detail.css";

type SortOption = "relevant" | "newest" | "rating_high" | "rating_low";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

type Props = {
  reviews: Review[];
  insights: ReviewInsights | null;
  city?: string;
};

function CategoryScoreChip({ label, score }: { label: string; score: number }) {
  const positive = score >= 8;
  return (
    <span className={`review-score-chip${positive ? " review-score-chip--high" : ""}`}>
      {positive && (
        <PrimeIcon name="pi-thumbs-up" size={14} className="review-score-chip-icon" aria-hidden />
      )}
      <span>
        {label} · <strong>{score.toFixed(1)}</strong>
      </span>
    </span>
  );
}

export function PropertyReviewsSection({ reviews, insights, city }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sort, setSort] = useState<SortOption>("relevant");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const visibleOtras = useMemo(() => {
    if (!insights?.otras.length) return [];
    return showAllCategories ? insights.otras : insights.otras.slice(0, 8);
  }, [insights, showAllCategories]);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (ratingFilter !== "all") {
      const min = Number(ratingFilter);
      list = list.filter((r) => Number(r.rating) === min);
    }
    switch (sort) {
      case "newest":
        list.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "rating_high":
        list.sort((a, b) => Number(b.rating) - Number(a.rating));
        break;
      case "rating_low":
        list.sort((a, b) => Number(a.rating) - Number(b.rating));
        break;
      default:
        list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [reviews, sort, ratingFilter]);

  const hasInsights = insights && insights.total > 0;

  return (
    <section className="property-section property-reviews-section" id="resenas" data-tour="property-reviews">
      <div className="section-head-row">
        <h2>{t("detail.reviewsTitle")}</h2>
        {reviews.length > 0 && (
          <span className="reviews-count">{tVars("detail.reviewsCount", { n: reviews.length })}</span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="muted">{t("detail.noReviews")}</p>
      ) : (
        <>
          {hasInsights && (
            <div className="review-insights">
              {insights.above_average_in_city && city && (
                <h3 className="review-insights-headline">
                  {tVars("reviews.aboveAverageIn", { city })}
                </h3>
              )}

              {insights.destacadas.length > 0 && (
                <div className="review-insights-block">
                  <p className="review-insights-label">{t("reviews.highlightedScores")}</p>
                  <div className="review-score-chips">
                    {insights.destacadas.map((item) => (
                      <CategoryScoreChip
                        key={item.key}
                        label={t(categoryLabelKey(item.key as ReviewCategoryKey))}
                        score={item.score}
                      />
                    ))}
                  </div>
                </div>
              )}

              {insights.otras.length > 0 && (
                <div className="review-insights-block">
                  <p className="review-insights-label">{t("reviews.otherGuestScores")}</p>
                  <div className="review-score-chips">
                    {visibleOtras.map((item) => (
                      <CategoryScoreChip
                        key={item.key}
                        label={t(categoryLabelKey(item.key as ReviewCategoryKey))}
                        score={item.score}
                      />
                    ))}
                  </div>
                  {insights.otras.length > 8 && !showAllCategories && (
                    <button
                      type="button"
                      className="review-see-all-categories"
                      onClick={() => setShowAllCategories(true)}
                    >
                      {tVars("reviews.seeAllCategories", { n: insights.otras.length })}
                      <PrimeIcon name="pi-chevron-down" size={14} />
                    </button>
                  )}
                </div>
              )}

              <div className="review-distribution">
                <h3 className="review-distribution-title">{t("reviews.opinionsTitle")}</h3>
                <ul className="review-distribution-list">
                  {insights.distribution.map((row) => (
                    <li key={row.key} className="review-distribution-row">
                      <span className="review-distribution-label">
                        {t(distributionLabelKey(row.key as ReviewDistributionKey))}
                      </span>
                      <div className="review-distribution-bar-wrap">
                        <div
                          className={`review-distribution-bar review-distribution-bar--${row.key}`}
                          style={{ width: `${Math.max(row.percent, row.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="review-distribution-pct">{row.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="review-filters">
            <label className="review-filter">
              <span>{t("reviews.sortBy")}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
                <option value="relevant">{t("reviews.sortRelevant")}</option>
                <option value="newest">{t("reviews.sortNewest")}</option>
                <option value="rating_high">{t("reviews.sortRatingHigh")}</option>
                <option value="rating_low">{t("reviews.sortRatingLow")}</option>
              </select>
            </label>
            <label className="review-filter">
              <span>{t("reviews.filterRating")}</span>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
              >
                <option value="all">{t("reviews.filterAll")}</option>
                <option value="5">5 ★</option>
                <option value="4">4 ★</option>
                <option value="3">3 ★</option>
                <option value="2">2 ★</option>
                <option value="1">1 ★</option>
              </select>
            </label>
            {(sort !== "relevant" || ratingFilter !== "all") && (
              <button
                type="button"
                className="review-clear-filters"
                onClick={() => {
                  setSort("relevant");
                  setRatingFilter("all");
                }}
              >
                {t("reviews.clearFilters")}
              </button>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <p className="muted">{t("reviews.noMatching")}</p>
          ) : (
            <div className="reviews-grid">
              {filteredReviews.map((r) => (
                <article key={r.id} className="review-card review-card--detailed">
                  <div className="review-card-head">
                    <p className="review-author">{r.autor_nombre}</p>
                    <StarRating rating={Number(r.rating)} size="sm" showValue={false} />
                  </div>
                  <ReviewStayMeta
                    habitacion={r.habitacion}
                    checkIn={r.check_in}
                    checkOut={r.check_out}
                    totalAmount={r.total_amount}
                  />
                  {r.category_ratings && Object.keys(r.category_ratings).length > 0 && (
                    <div className="review-card-categories">
                      {REVIEW_CATEGORY_KEYS.filter((k) => r.category_ratings?.[k]).slice(0, 4).map(
                        (key) => (
                          <span key={key} className="review-card-cat-chip">
                            {t(categoryLabelKey(key))} ·{" "}
                            {((Number(r.category_ratings![key]) || 0) * 2).toFixed(1)}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  <p className="review-text">{r.comment}</p>
                  <time className="muted">{formatDate(r.created_at.slice(0, 10))}</time>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
