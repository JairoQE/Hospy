import { useEffect, useId, useRef, useState } from "react";
import { loadMercadoPagoSdk } from "../../utils/mercadopagoSdk";
import type { MercadoPagoCardFormInstance } from "../../types/mercadopago";

interface Props {
  publicKey: string;
  amount: string;
  email: string;
  disabled?: boolean;
  onToken: (token: string) => Promise<void>;
}

export function MercadoPagoCardForm({
  publicKey,
  amount,
  email,
  disabled = false,
  onToken,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const cardFormRef = useRef<MercadoPagoCardFormInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ids = {
    form: `mp-form-${uid}`,
    cardNumber: `mp-card-${uid}`,
    expirationDate: `mp-exp-${uid}`,
    securityCode: `mp-cvc-${uid}`,
    cardholderName: `mp-name-${uid}`,
    issuer: `mp-issuer-${uid}`,
    installments: `mp-installments-${uid}`,
    identificationType: `mp-id-type-${uid}`,
    identificationNumber: `mp-id-number-${uid}`,
    cardholderEmail: `mp-email-${uid}`,
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadMercadoPagoSdk();
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "es-PE" });
        const cardForm = mp.cardForm({
          amount,
          iframe: true,
          form: {
            id: ids.form,
            cardNumber: { id: ids.cardNumber, placeholder: "Número de tarjeta" },
            expirationDate: { id: ids.expirationDate, placeholder: "MM/AA" },
            securityCode: { id: ids.securityCode, placeholder: "CVV" },
            cardholderName: { id: ids.cardholderName, placeholder: "Titular de la tarjeta" },
            issuer: { id: ids.issuer, placeholder: "Banco emisor" },
            installments: { id: ids.installments, placeholder: "Cuotas" },
            identificationType: { id: ids.identificationType, placeholder: "Tipo de documento" },
            identificationNumber: {
              id: ids.identificationNumber,
              placeholder: "Número de documento",
            },
            cardholderEmail: { id: ids.cardholderEmail, placeholder: "Email" },
          },
          callbacks: {
            onFormMounted: (mountError) => {
              if (cancelled) return;
              if (mountError) {
                setError("No se pudo cargar el formulario seguro de tarjeta.");
                setReady(false);
                return;
              }
              setReady(true);
            },
            onSubmit: (event) => {
              event.preventDefault();
            },
            onFetching: () => () => {},
          },
        });

        cardFormRef.current = cardForm;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al iniciar Mercado Pago.");
        }
      }
    })();

    return () => {
      cancelled = true;
      cardFormRef.current = null;
      setReady(false);
    };
  }, [publicKey, amount, uid]);

  useEffect(() => {
    const emailInput = document.getElementById(ids.cardholderEmail) as HTMLInputElement | null;
    if (emailInput && email && !emailInput.value) {
      emailInput.value = email;
    }
  }, [email, ids.cardholderEmail, ready]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardFormRef.current || submitting || disabled) return;

    setSubmitting(true);
    setError("");
    try {
      const data = cardFormRef.current.getCardFormData();
      if (!data.token) {
        setError("Completa los datos de la tarjeta.");
        return;
      }
      await onToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo tokenizar la tarjeta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id={ids.form} className="mp-card-form" onSubmit={(e) => void handleSubmit(e)}>
      <label className="mp-field-label">
        Número de tarjeta
        <div id={ids.cardNumber} className="mp-field-container" />
      </label>
      <div className="mp-field-row">
        <label className="mp-field-label">
          Vencimiento
          <div id={ids.expirationDate} className="mp-field-container" />
        </label>
        <label className="mp-field-label">
          CVV
          <div id={ids.securityCode} className="mp-field-container" />
        </label>
      </div>
      <label className="mp-field-label">
        Titular
        <input id={ids.cardholderName} type="text" placeholder="Como figura en la tarjeta" />
      </label>
      <label className="mp-field-label">
        Email
        <input
          id={ids.cardholderEmail}
          type="email"
          defaultValue={email}
          placeholder="correo@ejemplo.com"
        />
      </label>
      <div className="mp-field-row">
        <label className="mp-field-label">
          Tipo doc.
          <select id={ids.identificationType} defaultValue="">
            <option value="">Selecciona</option>
          </select>
        </label>
        <label className="mp-field-label">
          Número doc.
          <input id={ids.identificationNumber} type="text" placeholder="Documento" />
        </label>
      </div>
      <select id={ids.issuer} className="mp-hidden-select" aria-hidden tabIndex={-1} />
      <select id={ids.installments} className="mp-hidden-select" aria-hidden tabIndex={-1} />

      {error ? <p className="error-msg payment-error">{error}</p> : null}

      <button
        type="submit"
        className="btn btn-primary btn-block payment-submit"
        disabled={disabled || submitting || !ready}
      >
        {submitting ? "Procesando…" : ready ? "Pagar con tarjeta" : "Cargando formulario…"}
      </button>
    </form>
  );
}
