import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import type { AccommodationDetail } from "../api/types";
import { canInquireHost } from "../utils/hostChat";
import { buildWhatsAppUrl } from "../utils/whatsapp";

type Props = {
  accommodation: AccommodationDetail;
  entrada?: string;
  salida?: string;
  onOpenChat: () => void;
};

export function ContactHostSection({
  accommodation,
  entrada,
  salida,
  onOpenChat,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, tVars } = useLocaleCurrency();
  const ownerName = accommodation.propietario_nombre || t("detail.hostDefault");
  const phone = accommodation.propietario_telefono?.trim() ?? "";

  const whatsappText = [
    tVars("contact.waGreeting", { property: accommodation.name }),
    entrada && salida
      ? tVars("contact.waDates", { entrada, salida })
      : "",
    t("contact.waAsk"),
  ]
    .filter(Boolean)
    .join(" ");

  const whatsappUrl = phone ? buildWhatsAppUrl(phone, whatsappText) : null;

  const requireLogin = (action: () => void) => {
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: `/hospedajes/${accommodation.id}` } },
      });
      return;
    }
    if (!canInquireHost(user.role)) {
      return;
    }
    action();
  };

  const showSection = !user || canInquireHost(user.role);

  if (!showSection && user) {
    return null;
  }

  const showChat = !user || canInquireHost(user.role);

  return (
    <section className="property-section contact-host-section" id="contacto" data-tour="property-contact">
      <h2>{t("contact.title")}</h2>
      <p className="muted contact-host-lead">
        {tVars("contact.lead", { name: ownerName })}
      </p>
      <div className="contact-host-actions">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost contact-host-btn contact-host-btn--wa"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                requireLogin(() => window.open(whatsappUrl, "_blank", "noopener,noreferrer"));
              }
            }}
          >
            WhatsApp
          </a>
        ) : (
          <span
            className="btn btn-ghost contact-host-btn contact-host-btn--wa is-disabled"
            title={t("contact.waNoPhone")}
          >
            {t("contact.waUnavailable")}
          </span>
        )}
        {showChat && (
          <button
            type="button"
            className="btn btn-primary contact-host-btn"
            onClick={() => requireLogin(onOpenChat)}
          >
            Chat Hospy
          </button>
        )}
      </div>
      {!phone && (
        <p className="muted contact-host-hint">{t("contact.noWaHint")}</p>
      )}
    </section>
  );
}
