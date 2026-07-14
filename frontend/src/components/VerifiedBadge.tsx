type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * Insignia azul estilo redes sociales (check en sello) para identidad verificada.
 */
export function VerifiedBadge({
  size = 20,
  className = "",
  title = "Cuenta verificada",
}: Props) {
  return (
    <span
      className={`verified-badge${className ? ` ${className}` : ""}`}
      title={title}
      aria-label={title}
      role="img"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden focusable="false">
        <path
          className="verified-badge-seal"
          d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.137-5.6h5.905v-6.354L40 25.359 36.905 20 40 14.641l-5.6-3.137V5.15H28.85L25.358 0l-5.36 3.094Z"
        />
        <path
          className="verified-badge-check"
          d="m27.78 14.16-10.44 10.44-5.3-5.3-1.98 1.98 7.28 7.28 12.42-12.42z"
        />
      </svg>
    </span>
  );
}
