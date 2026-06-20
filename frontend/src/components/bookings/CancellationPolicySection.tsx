import { Link } from "react-router-dom";
import { PrimeIcon } from "../PrimeIcon";

const CANCEL_HOURS = 48;

type Props = {
  className?: string;
  /** Texto libre del propietario para este local. */
  ownerNotes?: string | null;
};

export function CancellationPolicySection({
  className = "property-section",
  ownerNotes,
}: Props) {
  const custom = (ownerNotes ?? "").trim();

  return (
    <section className={className} id="politica-cancelacion" aria-labelledby="cancel-policy-title">
      <h2 id="cancel-policy-title">Política de cancelación</h2>
      {custom ? (
        <p className="cancellation-policy-owner">{custom}</p>
      ) : (
        <p className="muted cancellation-policy-intro">
          El anfitrión no ha indicado condiciones adicionales. Aplican las reglas de la plataforma.
        </p>
      )}
      <ul className="cancellation-policy-list">
        <li>
          <PrimeIcon name="pi-calendar-times" size={18} />
          <span>
            Puedes cancelar desde <strong>Mis reservas</strong> si la reserva está{" "}
            <strong>pendiente</strong> o <strong>confirmada</strong>.
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-clock" size={18} />
          <span>
            En Hospy, la cancelación gratuita del huésped aplica hasta{" "}
            <strong>{CANCEL_HOURS} horas antes</strong> del check-in.
          </span>
        </li>
        <li>
          <PrimeIcon name="pi-ban" size={18} />
          <span>
            Las reservas <strong>completadas</strong> o <strong>canceladas</strong> ya no se
            pueden anular desde la app.
          </span>
        </li>
      </ul>
      <p className="muted cancellation-policy-more">
        Más información en <Link to="/legal/terminos">términos y condiciones</Link> y en el{" "}
        <Link to="/centro-ayuda">centro de ayuda</Link>.
      </p>
    </section>
  );
}
