import { PrimeIcon } from "../PrimeIcon";
import { REFUND_POLICY_LABELS, type RefundPolicyType } from "../../utils/refundPolicy";

type Props = {
  policyType?: string | null;
  bullets?: string[] | null;
  className?: string;
};

export function RefundPolicySection({
  policyType = "flexible",
  bullets,
  className = "property-section",
}: Props) {
  const type = (policyType ?? "flexible") as RefundPolicyType;
  const label = REFUND_POLICY_LABELS[type] ?? "Reembolso";
  const items = (bullets ?? []).filter((b) => b.trim());

  return (
    <section className={className} id="politica-reembolso" aria-labelledby="refund-policy-title">
      <h2 id="refund-policy-title">Política de reembolso</h2>
      <p className="muted cancellation-policy-intro">
        Política de <strong>este alojamiento</strong> ({label}). La cancelación en la app sigue las
        reglas de Hospy; el reembolso depende de esta política y del método de pago.
      </p>
      {items.length > 0 ? (
        <ul className="cancellation-policy-list">
          {items.map((text) => (
            <li key={text}>
              <PrimeIcon name="pi-wallet" size={18} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">El anfitrión no ha detallado condiciones de reembolso.</p>
      )}
    </section>
  );
}
