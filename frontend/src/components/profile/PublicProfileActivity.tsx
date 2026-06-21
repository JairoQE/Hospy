import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPublicProfileBookings,
  fetchPublicProfileReviews,
} from "../../api/publicProfile";
import type { PublicProfileBooking, PublicProfileReview } from "../../api/types";
import { REVIEW_CATEGORY_KEYS, categoryLabelKey } from "../../utils/reviewCategories";
import { formatDate } from "../../utils/format";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { IconSpinner } from "../icons";
import { PrimeIcon } from "../PrimeIcon";
import { StarRating } from "../StarRating";
import { StatusBadge } from "../StatusBadge";
import { ReviewStayMeta } from "../reviews/ReviewStayMeta";

type Props = {
  userId: number;
  firstName?: string;
};

function reviewGroupKey(review: PublicProfileReview): string {
  return `${review.hospedaje_id}:${review.habitacion ?? "—"}`;
}

export function PublicProfileActivity({ userId, firstName }: Props) {
  const { t } = useLocaleCurrency();
  const [bookings, setBookings] = useState<PublicProfileBooking[]>([]);
  const [reviews, setReviews] = useState<PublicProfileReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetchPublicProfileBookings(userId),
      fetchPublicProfileReviews(userId),
    ])
      .then(([bookingRows, reviewRows]) => {
        if (cancelled) return;
        setBookings(bookingRows);
        setReviews(reviewRows);
      })
      .catch(() => {
        if (cancelled) return;
        setBookings([]);
        setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const reviewGroups = useMemo(() => {
    const map = new Map<string, PublicProfileReview[]>();
    for (const review of reviews) {
      const key = reviewGroupKey(review);
      const list = map.get(key) ?? [];
      list.push(review);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      items,
      sample: items[0],
    }));
  }, [reviews]);

  const displayName = firstName?.trim() || "este usuario";

  if (loading) {
    return (
      <div className="profile-public-activity-loading">
        <IconSpinner size={24} />
        <span className="muted">Cargando actividad…</span>
      </div>
    );
  }

  if (bookings.length === 0 && reviews.length === 0) {
    return null;
  }

  return (
    <div className="profile-public-activity">
      {bookings.length > 0 && (
        <section className="card profile-public-section">
          <h2 className="profile-public-heading">
            <PrimeIcon name="pi-calendar" size={18} />
            Historial de reservas
          </h2>
          <p className="profile-public-section-lead muted">
            Estadías completadas de {displayName} en Hospy.
          </p>
          <ul className="profile-public-booking-list">
            {bookings.map((booking) => (
              <li key={booking.id} className="profile-public-booking-item">
                <div className="profile-public-booking-main">
                  <Link
                    to={`/hospedajes/${booking.accommodation_id}`}
                    className="profile-public-booking-title"
                  >
                    {booking.hospedaje}
                  </Link>
                  <p className="profile-public-booking-meta muted">
                    Hab. {booking.habitacion} · {booking.ciudad}
                  </p>
                  <p className="profile-public-booking-dates">
                    {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="card profile-public-section">
          <h2 className="profile-public-heading">
            <PrimeIcon name="pi-star" size={18} />
            Reseñas por habitación
          </h2>
          <p className="profile-public-section-lead muted">
            Opiniones publicadas tras sus estadías, agrupadas por hospedaje y habitación.
          </p>
          <div className="profile-public-review-groups">
            {reviewGroups.map(({ key, items, sample }) => (
              <article key={key} className="profile-public-review-group">
                <header className="profile-public-review-group-head">
                  <div>
                    <Link
                      to={`/hospedajes/${sample.hospedaje_id}`}
                      className="profile-public-review-group-title"
                    >
                      {sample.hospedaje_nombre}
                    </Link>
                    {sample.habitacion && (
                      <p className="muted profile-public-review-group-room">
                        Habitación {sample.habitacion}
                      </p>
                    )}
                  </div>
                  <span className="profile-public-review-count">
                    {items.length} reseña{items.length === 1 ? "" : "s"}
                  </span>
                </header>
                <div className="profile-public-review-cards">
                  {items.map((review) => (
                    <article key={review.id} className="profile-public-review-card">
                      <div className="profile-public-review-card-head">
                        <StarRating rating={Number(review.rating)} size="sm" showValue />
                        <time className="muted">{formatDate(review.created_at.slice(0, 10))}</time>
                      </div>
                      <ReviewStayMeta
                        habitacion={review.habitacion}
                        checkIn={review.check_in}
                        checkOut={review.check_out}
                      />
                      {review.category_ratings &&
                        Object.keys(review.category_ratings).length > 0 && (
                          <div className="profile-public-review-categories">
                            {REVIEW_CATEGORY_KEYS.filter((k) => review.category_ratings?.[k])
                              .slice(0, 5)
                              .map((key) => (
                                <span key={key} className="profile-public-review-cat">
                                  {t(categoryLabelKey(key))}:{" "}
                                  {((Number(review.category_ratings![key]) || 0) * 2).toFixed(1)}
                                </span>
                              ))}
                          </div>
                        )}
                      <p className="profile-public-review-text">{review.comment}</p>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
