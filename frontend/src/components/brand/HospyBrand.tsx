import { Link } from "react-router-dom";
import { PrimeIcon } from "../PrimeIcon";
import { HospyIcon } from "./HospyIcon";

type Props = {
  compact?: boolean;
};

export function HospyBrand({ compact = false }: Props) {
  return (
    <Link to="/" className="hospy-brand" aria-label="Hospy — Inicio">
      <HospyIcon size={compact ? 36 : 40} className="hospy-brand-icon" />
      <span className="hospy-brand-text">
        <span className="hospy-brand-name">Hospy</span>
        {!compact && (
          <span className="hospy-brand-tagline">
            Hoteles · Hostales · Hospedajes
          </span>
        )}
      </span>
      <span className="hospy-brand-verified" title="Alojamientos verificados">
        <PrimeIcon name="pi-check" size={12} />
        Verificado
      </span>
    </Link>
  );
}
