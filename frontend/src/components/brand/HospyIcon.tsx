import { HospyLogo } from "./HospyLogo";

interface Props {
  size?: number;
  className?: string;
}

/** Ícono cuadrado del logo (recorte del pin H). */
export function HospyIcon({ size = 40, className = "" }: Props) {
  return <HospyLogo height={size} variant="mark" className={className} />;
}
