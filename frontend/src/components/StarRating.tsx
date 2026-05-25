type Props = {
  rating: number;
  max?: number;
  showValue?: boolean;
  size?: "sm" | "md";
};

export function StarRating({ rating, max = 5, showValue = true, size = "md" }: Props) {
  const safe = Math.min(max, Math.max(0, Number(rating) || 0));
  const pct = (safe / max) * 100;

  return (
    <div
      className={`star-rating star-rating--${size}`}
      role="img"
      aria-label={`Calificación ${safe.toFixed(1)} de ${max}`}
    >
      <span className="star-rating-stars" aria-hidden>
        <span className="star-rating-track">★★★★★</span>
        <span className="star-rating-fill" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      {showValue && <span className="star-rating-value">{safe.toFixed(1)}</span>}
    </div>
  );
}
