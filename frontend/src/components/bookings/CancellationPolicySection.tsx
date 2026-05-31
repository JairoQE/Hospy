import { Link } from "react-router-dom";
import { PrimeIcon } from "../PrimeIcon";

const CANCEL_HOURS = 48;

type Props = {
  className?: string;
};

export function CancellationPolicySection({ className = "property-section" }: Props) {
  return (
    <section className={className} id="politica-cancelacion" aria-labelledby="cancel-policy-title">
      <h2 id="cancel-policy-title">Política de cancelación</h2>
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
            Como huésped, la cancelación gratuita aplica hasta{" "}
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
        <li>
          <PrimeIcon name="pi-wallet" size={18} />
          <span>
            El reembolso depende del acuerdo con el anfitrión y del método de pago usado al
            reservar.
          </span>
        </li>
      </ul>
      <p className="muted cancellation-policy-more">
        Más información en{" "}
        <Link to="/legal/terminos-y-condiciones">términos y condiciones</Link> y en el{" "}
        <Link to="/centro-ayuda">centro de ayuda</Link>.
      </p>
    </section>
  );
}
