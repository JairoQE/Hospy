import logoSrc from "../../assets/hospy-logo.png";

export type HospyLogoVariant = "full" | "mark";

interface Props {
  height?: number;
  variant?: HospyLogoVariant;
  className?: string;
  alt?: string;
}

/** Logo oficial Hospy (PNG). `full` = marca completa; `mark` = solo el ícono para espacios pequeños. */
export function HospyLogo({
  height = 48,
  variant = "full",
  className = "",
  alt = "Hospy — Conexión a tu destino",
}: Props) {
  const classes = ["hospy-logo", `hospy-logo--${variant}`, className].filter(Boolean).join(" ");

  if (variant === "mark") {
    return (
      <img
        src={logoSrc}
        alt=""
        aria-hidden
        className={classes}
        width={height}
        height={height}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={classes}
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
    />
  );
}
