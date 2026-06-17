import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPagoEfectivo,
  fetchBookingPayment,
  fetchPaymentMethods,
  payWithCard,
  payWithYape,
  requestExternalPayment,
  type PaymentMethodOption,
  type PaymentRecord,
} from "../../api/payments";
import type { PaymentIpRisk } from "../../api/geo";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { MercadoPagoCardForm } from "./MercadoPagoCardForm";
import { PrimeIcon } from "../PrimeIcon";

interface Props {
  bookingId: number;
  amount: string;
  accommodationName: string;
  onClose: () => void;
  onPaid: () => void;
  onContactHost?: () => void;
}

type TabId = "yape" | "card" | "pagoefectivo" | "externo";

export function PaymentCheckoutModal({
  bookingId,
  amount,
  accommodationName,
  onClose,
  onPaid,
  onContactHost,
}: Props) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [gateway, setGateway] = useState<"mock" | "culqi" | "mercadopago">("mock");
  const [culqiPublicKey, setCulqiPublicKey] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [tab, setTab] = useState<TabId>("externo");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [ipRisk, setIpRisk] = useState<PaymentIpRisk | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [methodsRes, paymentRes] = await Promise.all([
          fetchPaymentMethods(),
          fetchBookingPayment(bookingId),
        ]);
        if (cancelled) return;
        setMethods(methodsRes.methods.filter((m) => m.enabled));
        setGateway(methodsRes.gateway);
        setCulqiPublicKey(methodsRes.culqi_public_key || "");
        setMpPublicKey(methodsRes.mp_public_key || "");
        setPayment(paymentRes);

        const onlineAvailable = paymentRes.online_checkout_available !== false;
        const onlineIds = new Set(["yape", "card", "pagoefectivo"]);
        const first = methodsRes.methods.find(
          (m) =>
            m.enabled &&
            (m.id === "externo" || (onlineAvailable && onlineIds.has(m.id))),
        );
        if (
          first &&
          (first.id === "yape" ||
            first.id === "card" ||
            first.id === "pagoefectivo" ||
            first.id === "externo")
        ) {
          setTab(first.id);
        }

        if (
          paymentRes.method === "externo" &&
          paymentRes.status === "procesando"
        ) {
          setInstruction(
            paymentRes.instruction ||
              "Espera a que el anfitrión confirme el pago. Puedes escribirle por el chat.",
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "No se pudo cargar el pago.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const onlineCheckoutAvailable = payment?.online_checkout_available !== false;

  const tabs = useMemo(
    () =>
      methods.filter((m): m is PaymentMethodOption & { id: TabId } => {
        if (m.id === "externo") return true;
        if (!onlineCheckoutAvailable) return false;
        return m.id === "yape" || m.id === "card" || m.id === "pagoefectivo";
      }),
    [methods, onlineCheckoutAvailable],
  );

  const externalPending =
    payment?.method === "externo" && payment.status === "procesando";

  const handleYape = useCallback(async () => {
    if (!payment) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await payWithYape(payment.id, phone.trim(), otp.trim());
      setPayment(result);
      if (result.ip_risk) setIpRisk(result.ip_risk);
      if (result.status === "pagado") onPaid();
      else setError(result.failure_message || "No se pudo completar el pago.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al pagar con Yape.");
    } finally {
      setSubmitting(false);
    }
  }, [payment, phone, otp, onPaid]);

  const handleCardToken = useCallback(
    async (sourceId: string) => {
      if (!payment) return;
      setSubmitting(true);
      setError("");
      try {
        const result = await payWithCard(payment.id, sourceId);
        setPayment(result);
        if (result.ip_risk) setIpRisk(result.ip_risk);
        if (result.status === "pagado") onPaid();
        else setError(result.failure_message || "No se pudo completar el pago.");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Error al pagar con tarjeta.");
      } finally {
        setSubmitting(false);
      }
    },
    [payment, onPaid],
  );

  const handleCard = useCallback(async () => {
    if (!payment) return;
    await handleCardToken("tkn_test_mock");
  }, [payment, handleCardToken]);

  const handlePagoEfectivo = useCallback(async () => {
    if (!payment) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createPagoEfectivo(payment.id);
      setPayment(result);
      if (result.ip_risk) setIpRisk(result.ip_risk);
      setInstruction(result.instruction || result.failure_message || "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al generar PagoEfectivo.");
    } finally {
      setSubmitting(false);
    }
  }, [payment]);

  const handleExternal = useCallback(async () => {
    if (!payment) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await requestExternalPayment(payment.id);
      setPayment(result);
      setInstruction(
        result.instruction ||
          "Contacta al anfitrión para acordar el pago. Cuando lo reciba, confirmará la reserva.",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar el pago directo.");
    } finally {
      setSubmitting(false);
    }
  }, [payment]);

  return (
    <>
      <div className="payment-modal-backdrop" onClick={onClose} aria-hidden />
      <div
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Pagar reserva"
      >
        <div className="payment-modal-head">
          <div>
            <h2>Pagar reserva</h2>
            <p className="muted">{accommodationName}</p>
          </div>
          <button type="button" className="payment-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="payment-modal-summary">
          <span>Total a pagar</span>
          <strong>S/ {amount}</strong>
        </div>

        {ipRisk && ipRisk.level !== "low" && (
          <div className={`payment-ip-risk payment-ip-risk--${ipRisk.level}`} role="status">
            <strong>Verificación de ubicación (ip.guide)</strong>
            <p>{ipRisk.messages?.[0] || "Conexión con señales de riesgo moderado."}</p>
          </div>
        )}

        {loading ? (
          <p className="payment-modal-loading">Cargando métodos de pago…</p>
        ) : (
          <>
            {!onlineCheckoutAvailable && (
              <p className="payment-mock-hint">
                Este anfitrión no tiene cobro en línea configurado. Coordina el pago directamente
                con él (transferencia, Yape o efectivo).
              </p>
            )}

            <div className="payment-tabs" role="tablist">
              {tabs.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  className={`payment-tab${tab === m.id ? " is-active" : ""}`}
                  aria-selected={tab === m.id}
                  onClick={() => {
                    setTab(m.id);
                    setError("");
                    if (m.id !== "externo") setInstruction("");
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {gateway === "mock" && onlineCheckoutAvailable && tab !== "externo" && (
              <p className="payment-mock-hint">
                Modo prueba: Yape usa OTP <strong>123456</strong>. Tarjeta usa token de prueba.
              </p>
            )}

            {gateway === "mercadopago" && onlineCheckoutAvailable && tab !== "externo" && (
              <p className="payment-mock-hint">
                Mercado Pago (credenciales de prueba): usa un código real de Yape desde tu app.
              </p>
            )}

            {tab === "yape" && (
              <div className="payment-panel">
                <p className="payment-panel-help">
                  Abre Yape → <strong>Código de aprobación</strong> → ingresa tu celular y el código aquí.
                </p>
                <label>
                  Celular Yape
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Ej. 999 888 777"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={15}
                  />
                </label>
                <label>
                  Código de aprobación
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="6 dígitos"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-block payment-submit"
                  disabled={submitting || phone.trim().length < 9 || otp.length !== 6}
                  onClick={handleYape}
                >
                  {submitting ? "Procesando…" : "Pagar con Yape"}
                </button>
              </div>
            )}

            {tab === "card" && (
              <div className="payment-panel">
                <p className="payment-panel-help">
                  Paga con tarjeta de débito o crédito (Visa, Mastercard).
                </p>
                {gateway === "mercadopago" && mpPublicKey ? (
                  <MercadoPagoCardForm
                    publicKey={mpPublicKey}
                    amount={amount}
                    email={user?.email || ""}
                    disabled={submitting}
                    onToken={handleCardToken}
                  />
                ) : (
                  <>
                    {culqiPublicKey ? (
                      <p className="muted">
                        Culqi configurado. Usa el flujo de prueba hasta integrar Culqi.js.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary btn-block payment-submit"
                      disabled={submitting}
                      onClick={handleCard}
                    >
                      {submitting ? "Procesando…" : "Pagar con tarjeta (prueba)"}
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === "pagoefectivo" && (
              <div className="payment-panel">
                <p className="payment-panel-help">
                  Genera un código para pagar en agentes, bodegas o banca móvil.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block payment-submit"
                  disabled={submitting}
                  onClick={handlePagoEfectivo}
                >
                  {submitting ? "Generando…" : "Generar código PagoEfectivo"}
                </button>
                {instruction ? (
                  <p className="payment-instruction">{instruction}</p>
                ) : null}
              </div>
            )}

            {tab === "externo" && (
              <div className="payment-panel">
                <p className="payment-panel-help">
                  Acuerda con el anfitrión transferencia, Yape, Plin o efectivo fuera del checkout
                  de Hospy. La reserva quedará registrada cuando el anfitrión confirme que recibió
                  el pago.
                </p>
                {payment?.owner_contact?.phone ? (
                  <p className="payment-owner-contact">
                    Contacto: <strong>{payment.owner_contact.name}</strong>
                    {payment.owner_contact.phone ? (
                      <>
                        {" "}
                        · Tel. {payment.owner_contact.phone}
                      </>
                    ) : null}
                  </p>
                ) : null}
                {externalPending ? (
                  <>
                    <p className="success-msg payment-success">
                      <PrimeIcon name="pi-clock" size={18} /> Pago directo registrado. Espera la
                      confirmación del anfitrión.
                    </p>
                    {onContactHost ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-block"
                        onClick={onContactHost}
                      >
                        Escribir al anfitrión
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    {onContactHost ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-block"
                        onClick={onContactHost}
                      >
                        Contactar anfitrión
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary btn-block payment-submit"
                      disabled={submitting || payment?.status === "pagado"}
                      onClick={handleExternal}
                    >
                      {submitting ? "Registrando…" : "Registrar pago directo con anfitrión"}
                    </button>
                  </>
                )}
                {instruction ? (
                  <p className="payment-instruction">{instruction}</p>
                ) : null}
              </div>
            )}

            {error ? <p className="error-msg payment-error">{error}</p> : null}

            {payment?.status === "pagado" ? (
              <p className="success-msg payment-success">
                <PrimeIcon name="pi-check-circle" size={18} /> Pago completado. Reserva confirmada.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
