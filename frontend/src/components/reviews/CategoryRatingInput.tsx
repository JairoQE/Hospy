import { PrimeIcon } from "../PrimeIcon";

type Props = {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function CategoryRatingInput({ label, value, disabled, onChange }: Props) {
  return (
    <div className="category-rating-row">
      <span className="category-rating-label">{label}</span>
      <div className="category-rating-stars" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`category-rating-star${n <= value ? " is-active" : ""}`}
            aria-label={`${n} de 5`}
            aria-pressed={n <= value}
            disabled={disabled}
            onClick={() => onChange(n)}
          >
            <PrimeIcon name="pi-star-fill" size={16} />
          </button>
        ))}
        <span className="category-rating-score">{(value * 2).toFixed(1)}</span>
      </div>
    </div>
  );
}
