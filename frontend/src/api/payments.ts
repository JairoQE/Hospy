import { api } from "./client";

export interface PaymentMethodOption {
  id: "yape" | "card" | "pagoefectivo" | "plin" | "externo";
  label: string;
  description: string;
  enabled: boolean;
}

export interface PaymentMethodsResponse {
  gateway: "mock" | "culqi" | "mercadopago";
  culqi_public_key: string;
  mp_public_key: string;
  mp_webhook_url?: string;
  methods: PaymentMethodOption[];
}

import type { PaymentIpRisk } from "./geo";

export interface PaymentRecord {
  id: number;
  booking_id: number;
  amount: string;
  currency: string;
  method: string;
  status: "pendiente" | "procesando" | "pagado" | "fallido" | "expirado" | "cancelado";
  gateway: string;
  gateway_charge_id: string;
  gateway_order_id: string;
  failure_message: string;
  paid_at: string | null;
  expires_at: string | null;
  is_mock: boolean;
  created_at: string;
  instruction?: string;
  ip_risk?: PaymentIpRisk;
  online_checkout_available?: boolean;
  owner_contact?: {
    name: string;
    phone: string;
  };
}

export interface BookingPaymentSummary {
  id: number;
  status: PaymentRecord["status"];
  method: string | null;
  amount: string;
  expires_at: string | null;
}

export function fetchPaymentMethods() {
  return api.get<PaymentMethodsResponse>("/pagos/metodos/", false);
}

export function fetchBookingPayment(bookingId: number) {
  return api.get<PaymentRecord>(`/reservas/${bookingId}/pago/`);
}

export function payWithYape(paymentId: number, phone: string, otp: string) {
  return api.post<PaymentRecord>(`/pagos/${paymentId}/yape/`, { phone, otp });
}

export function payWithCard(paymentId: number, sourceId: string) {
  return api.post<PaymentRecord>(`/pagos/${paymentId}/tarjeta/`, {
    source_id: sourceId,
  });
}

export function createPagoEfectivo(paymentId: number) {
  return api.post<PaymentRecord>(`/pagos/${paymentId}/pagoefectivo/`, {});
}

export function requestExternalPayment(paymentId: number) {
  return api.post<PaymentRecord>(`/pagos/${paymentId}/externo/`, {});
}

export function confirmExternalPayment(paymentId: number) {
  return api.post<PaymentRecord>(`/pagos/${paymentId}/confirmar-externo/`, {});
}
