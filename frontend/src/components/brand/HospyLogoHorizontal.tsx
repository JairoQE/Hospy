import { HospyLogo } from "./HospyLogo";

interface Props {
  height?: number;
  className?: string;
}

/** Logo horizontal (marca completa escalada). */
export function HospyLogoHorizontal({ height = 48, className = "" }: Props) {
  return <HospyLogo height={height} variant="full" className={className} />;
}
