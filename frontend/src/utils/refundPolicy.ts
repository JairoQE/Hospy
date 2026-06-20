export type RefundPolicyType =
  | "flexible"
  | "moderate"
  | "strict"
  | "non_refundable"
  | "custom";

export const REFUND_POLICY_OPTIONS: {
  value: RefundPolicyType;
  label: string;
  hint: string;
}[] = [
  {
    value: "flexible",
    label: "Flexible",
    hint: "100 % si cancelan con X horas de anticipación (tú defines X, default 48 h).",
  },
  {
    value: "moderate",
    label: "Moderada",
    hint: "100 % hasta 5 días antes; 50 % hasta 48 h; sin reembolso después.",
  },
  {
    value: "strict",
    label: "Estricta",
    hint: "50 % hasta 7 días antes; sin reembolso después.",
  },
  {
    value: "non_refundable",
    label: "No reembolsable",
    hint: "Sin devolución automática al cancelar.",
  },
  {
    value: "custom",
    label: "Personalizada",
    hint: "Describe tus condiciones en el cuadro de texto.",
  },
];

export const REFUND_POLICY_LABELS: Record<RefundPolicyType, string> = Object.fromEntries(
  REFUND_POLICY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RefundPolicyType, string>;
