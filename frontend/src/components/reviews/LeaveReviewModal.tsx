import { useState } from "react";
import { ApiError, api } from "../../api/client";
import { formatApiError } from "../../api/errors";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import {
  REVIEW_CATEGORY_KEYS,
  categoryLabelKey,
  defaultCategoryRatings,
  type ReviewCategoryKey,
} from "../../utils/reviewCategories";
import { PrimeIcon } from "../PrimeIcon";
import { CategoryRatingInput } from "./CategoryRatingInput";
import { ReviewStayMeta } from "./ReviewStayMeta";
import "../../styles/reviews-detail.css";

type Props = {
  open: boolean;
  accommodationId: number;
  bookingId: number;
  hospedajeName: string;
  habitacion?: string;
  checkIn?: string;
  checkOut?: string;
  totalAmount?: string | number;
  onClose: () => void;
  onSuccess: () => void;
};

export function LeaveReviewModal({
  open,
  accommodationId,
  bookingId,
  hospedajeName,
  habitacion,
  checkIn,
  checkOut,
  totalAmount,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useLocaleCurrency();
  const [rating, setRating] = useState(5);
  const [categories, setCategories] = useState(defaultCategoryRatings);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const setCategory = (key: ReviewCategoryKey, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (text.length < 10) {
      setError(t("reviews.commentMinLength"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/resenas/", {
        accommodation: accommodationId,
        booking: bookingId,
        rating,
        category_ratings: categories,
        comment: text,
      });
      onSuccess();
      onClose();
      setComment("");
      setRating(5);
      setCategories(defaultCategoryRatings());
    } catch (err) {
      setError(
        err instanceof ApiError ? formatApiError(err.data) : t("reviews.submitError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="leave-review-overlay"
      role="presentation"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="leave-review-modal leave-review-modal--detailed card-elevated"
        role="dialog"
        aria-labelledby="leave-review-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="leave-review-head">
          <h2 id="leave-review-title">{t("reviews.leaveTitle")}</h2>
          <button
            type="button"
            className="leave-review-close"
            aria-label={t("reviews.close")}
            disabled={submitting}
            onClick={onClose}
          >
            <PrimeIcon name="pi-times" size={18} />
          </button>
        </header>

        <p className="muted leave-review-sub">
          {t("reviews.leaveIntro")} <strong>{hospedajeName}</strong>{" "}
          {t("reviews.leaveIntroEnd")}
        </p>
        <ReviewStayMeta
          habitacion={habitacion}
          checkIn={checkIn}
          checkOut={checkOut}
          totalAmount={totalAmount}
          className="leave-review-stay muted"
        />

        <form onSubmit={submit}>
          <div className="leave-review-overall">
            <span className="leave-review-overall-label">{t("reviews.overallRating")}</span>
            <fieldset className="leave-review-stars">
              <legend className="sr-only">{t("reviews.overallRating")}</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`leave-review-star${n <= rating ? " is-active" : ""}`}
                  aria-label={`${n} estrellas`}
                  aria-pressed={n <= rating}
                  disabled={submitting}
                  onClick={() => setRating(n)}
                >
                  <PrimeIcon name="pi-star-fill" size={22} />
                </button>
              ))}
            </fieldset>
          </div>

          <fieldset className="leave-review-categories">
            <legend>{t("reviews.categoriesLegend")}</legend>
            <div className="leave-review-categories-grid">
              {REVIEW_CATEGORY_KEYS.map((key) => (
                <CategoryRatingInput
                  key={key}
                  label={t(categoryLabelKey(key))}
                  value={categories[key]}
                  disabled={submitting}
                  onChange={(v) => setCategory(key, v)}
                />
              ))}
            </div>
          </fieldset>

          <label className="leave-review-label" htmlFor="leave-review-comment">
            {t("reviews.commentLabel")}
          </label>
          <textarea
            id="leave-review-comment"
            className="leave-review-textarea"
            rows={4}
            maxLength={2000}
            placeholder={t("reviews.commentPlaceholder")}
            value={comment}
            disabled={submitting}
            onChange={(e) => setComment(e.target.value)}
          />

          {error && (
            <p className="error-msg leave-review-error" role="alert">
              {error}
            </p>
          )}

          <div className="leave-review-actions">
            <button type="button" className="btn btn-ghost" disabled={submitting} onClick={onClose}>
              {t("reviews.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t("reviews.submitting") : t("reviews.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
