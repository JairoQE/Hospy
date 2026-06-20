type SpinnerSize = "sm" | "md" | "lg";

type Props = {
  size?: SpinnerSize;
  label?: string;
  className?: string;
  centered?: boolean;
};

export function LoadingSpinner({
  size = "md",
  label,
  className = "",
  centered = false,
}: Props) {
  const rootClass = [
    centered ? "loading-spinner-center" : "loading-spinner-inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <span className={`spinner spinner--${size}`} aria-hidden />
      {label ? (
        <span className="loading-spinner-label">{label}</span>
      ) : (
        <span className="sr-only">Cargando</span>
      )}
    </div>
  );
}
