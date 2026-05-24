import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AccommodationDetail } from "../api/types";
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
  const ownerName = accommodation.propietario_nombre || "el anfitrión";
  const phone = accommodation.propietario_telefono?.trim() ?? "";

  const whatsappText = [
    `Hola, me interesa «${accommodation.name}».`,
    entrada && salida ? `Fechas: ${entrada} → ${salida}.` : "",
    "¿Podrías darme más información?",
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
    if (user.role !== "huesped") {
      return;
    }
    action();
  };

  const canContact = !user || user.role === "huesped";

  if (!canContact && user) {
    return null;
  }

  return (
    <section className="property-section contact-host-section" id="contacto">
      <h2>Contactar al anfitrión</h2>
      <p className="muted contact-host-lead">
        ¿Tienes dudas antes de reservar? Escríbele a {ownerName} por WhatsApp o por el chat de
        Hospy.
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
            title="El anfitrión no registró un número de WhatsApp"
          >
            WhatsApp (no disponible)
          </span>
        )}
        <button
          type="button"
          className="btn btn-primary contact-host-btn"
          onClick={() => requireLogin(onOpenChat)}
        >
          Chat Hospy
        </button>
      </div>
      {!phone && (
        <p className="muted contact-host-hint">
          El anfitrión no tiene WhatsApp registrado; usa el chat de Hospy para consultar.
        </p>
      )}
    </section>
  );
}
