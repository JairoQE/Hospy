import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { VerifiedBadge } from "../VerifiedBadge";
import { PrimeIcon } from "../PrimeIcon";

const DISMISS_KEY = "hospy_verify_promo_dismissed_v1";

const BENEFITS = [
  {
    icon: "pi-verified" as const,
    title: "Insignia azul",
    text: "Aparece junto a tu nombre en perfil, reseñas y mensajes.",
  },
  {
    icon: "pi-sort-amount-up" as const,
    title: "Reseñas primero",
    text: "Tus opiniones se muestran antes que las no verificadas.",
  },
  {
    icon: "pi-shield" as const,
    title: "Más confianza",
    text: "Anfitriones y viajeros confían más en cuentas reales.",
  },
  {
    icon: "pi-bolt" as const,
    title: "Más facilidades",
    text: "Mejor visibilidad y prioridad en soporte. Sin bloquear a nadie.",
  },
];

type Props = {
  /** full = perfil; compact = aviso bajo el header */
  variant?: "full" | "compact";
  className?: string;
};

export function VerifyIdentityPromoBanner({ variant = "full", className = "" }: Props) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!user || user.is_identity_verified) return null;
  if (pathname.startsWith("/login") || pathname.startsWith("/registro")) return null;
  if (variant === "compact" && (pathname === "/perfil" || pathname.startsWith("/perfil/"))) {
    return null;
  }
  if (dismissed && variant === "compact") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (variant === "compact") {
    return (
      <div className={`verify-promo verify-promo--compact ${className}`.trim()} role="region" aria-label="Verificar identidad">
        <div className="verify-promo-compact-inner">
          <VerifiedBadge size={18} />
          <p className="verify-promo-compact-text">
            <strong>Verifica tu identidad</strong>
            <span> y gana insignia azul, reseñas prioritarias y más confianza.</span>
          </p>
          <Link to="/perfil#verificar-identidad" className="btn btn-primary btn-sm verify-promo-cta">
            Verificar ahora
          </Link>
          <button type="button" className="verify-promo-dismiss" onClick={dismiss} aria-label="Cerrar aviso">
            <PrimeIcon name="pi-times" size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`verify-promo verify-promo--full ${className}`.trim()}
      aria-labelledby="verify-promo-title"
    >
      <div className="verify-promo-glow" aria-hidden />
      <div className="verify-promo-head">
        <div className="verify-promo-badge-wrap">
          <VerifiedBadge size={36} />
        </div>
        <div className="verify-promo-copy">
          <p className="verify-promo-eyebrow">Opcional · No bloquea nada</p>
          <h2 id="verify-promo-title">Verifica tu identidad y destaca en Hospy</h2>
          <p className="verify-promo-lead">
            Confirma tu DNI con RENIEC en segundos. Obtienes beneficios reales de confianza y
            visibilidad — sin perder funciones si aún no te verificas.
          </p>
        </div>
      </div>

      <ul className="verify-promo-benefits">
        {BENEFITS.map((b) => (
          <li key={b.title}>
            <span className="verify-promo-benefit-icon" aria-hidden>
              <PrimeIcon name={b.icon} size={18} />
            </span>
            <div>
              <strong>{b.title}</strong>
              <span>{b.text}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="verify-promo-actions">
        <a href="#verificar-identidad" className="btn btn-primary verify-promo-cta">
          Verificar mi identidad
        </a>
        <p className="verify-promo-note muted">
          Solo necesitas tu DNI. Tus datos se usan solo para confirmar quién eres.
        </p>
      </div>
    </section>
  );
}
