import { Link } from "react-router-dom";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { HospyLogo } from "./HospyLogo";

type Props = {
  compact?: boolean;
};

export function HospyBrand({ compact = false }: Props) {
  const { t } = useLocaleCurrency();

  return (
    <Link to="/" className="hospy-brand" aria-label={t("brand.homeAria")}>
      <HospyLogo
        height={compact ? 48 : 56}
        variant="full"
        className="hospy-brand-logo"
        alt={t("brand.logoAlt")}
      />
      <span className="hospy-brand-verified" title={t("footer.verified")}>
        <PrimeIcon name="pi-check" size={12} />
        {t("brand.verified")}
      </span>
    </Link>
  );
}
