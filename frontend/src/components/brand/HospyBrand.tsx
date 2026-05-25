import { Link } from "react-router-dom";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { HospyIcon } from "./HospyIcon";

type Props = {
  compact?: boolean;
};

export function HospyBrand({ compact = false }: Props) {
  const { t } = useLocaleCurrency();

  return (
    <Link to="/" className="hospy-brand" aria-label={t("brand.homeAria")}>
      <HospyIcon size={compact ? 36 : 40} className="hospy-brand-icon" />
      <span className="hospy-brand-text">
        <span className="hospy-brand-name">Hospy</span>
        {!compact && (
          <span className="hospy-brand-tagline">{t("brand.tagline")}</span>
        )}
      </span>
      <span className="hospy-brand-verified" title={t("footer.verified")}>
        <PrimeIcon name="pi-check" size={12} />
        {t("brand.verified")}
      </span>
    </Link>
  );
}
