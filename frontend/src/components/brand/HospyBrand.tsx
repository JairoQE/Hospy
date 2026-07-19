import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { PrimeIcon } from "../PrimeIcon";
import { HospyLogo } from "./HospyLogo";

type Props = {
  compact?: boolean;
};

/** Fuerza home limpio aunque ya estemos en `/` con resultados en memoria. */
export const HOME_RESET_STATE_KEY = "resetHome";

export function HospyBrand({ compact = false }: Props) {
  const { t } = useLocaleCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Link
      to="/"
      className="hospy-brand"
      aria-label={t("brand.homeAria")}
      onClick={(e) => {
        if (location.pathname !== "/") return;
        e.preventDefault();
        navigate("/", {
          replace: true,
          state: { [HOME_RESET_STATE_KEY]: Date.now() },
        });
      }}
    >
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
