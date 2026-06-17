import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { confirmExternalPayment } from "../api/payments";
import {
  clearOwnerPanelBootstrapCache,
  fetchOwnerPanelBootstrap,
  loadCachedOwnerPanelBootstrap,
} from "../api/ownerPanelBootstrap";
import { useAuth } from "../context/AuthContext";
import { formatApiError, parseFieldErrors } from "../api/errors";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  Service,
} from "../api/types";
import {
  AccommodationForm,
  emptyAccommodationForm,
  type AccommodationFormData,
} from "../components/AccommodationForm";
import { OwnerInquiriesPanel } from "../components/OwnerInquiriesPanel";
import { OwnerDashboard } from "../components/owner/OwnerDashboard";
import { OwnerPropertiesList } from "../components/owner/OwnerPropertiesList";
import { ownerTabPath, tabFromParams } from "../utils/ownerPanelRoutes";
import { useInboxSummary } from "../hooks/useInboxSummary";
import { StatusBadge } from "../components/StatusBadge";
import { OwnerBookingHintBox } from "../components/owner/OwnerBookingHint";
import { OwnerToastHost, showOwnerToast } from "../components/owner/OwnerToast";
import {
  isOwnerBookingStaleActionError,
  ownerBookingStaleActionToast,
} from "../utils/ownerBookingActionFeedback";
import {
  ownerBookingAwaitingExternalPayment,
  ownerBookingHint,
  ownerBookingPaymentLabel,
  ownerBookingShowManualConfirm,
} from "../utils/ownerBookingHints";
import { formatCoordinate } from "../utils/coordinates";
import { formatDate, formatMoney } from "../utils/format";
import "../styles/owner-panel.css";

function faqsPayload(form: AccommodationFormData) {
  return form.faqs
    .filter((f) => f.question.trim() && f.answer.trim())
    .map((f) => ({
      question: f.question.trim(),
      answer: f.answer.trim(),
    }));
}

function formToPayload(form: AccommodationFormData) {
  return {
    ...form,
    latitude: formatCoordinate(form.latitude),
    longitude: formatCoordinate(form.longitude),
    service_ids: form.service_ids,
    faqs: faqsPayload(form),
  };
}

export function OwnerPanelPage() {
  const { user, isOwnerApproved, isOwnerPayoutReady } = useAuth();
  const ownerApproved = isOwnerApproved();
  const ownerPayoutReady = isOwnerPayoutReady();
  const ownerPending = user?.owner_status === "pendiente";
  const ownerRejected = user?.owner_status === "rechazado";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = tabFromParams(searchParams);
  const goToTab = (next: Parameters<typeof ownerTabPath>[0]) => {
    navigate(ownerTabPath(next));
  };
  const [mine, setMine] = useState<AccommodationListItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const { summary: inboxSummary } = useInboxSummary(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyAccommodationForm);
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);

  const load = (options?: { skipCache?: boolean; silent?: boolean }) => {
    if (!ownerApproved) {
      setMine([]);
      setBookings([]);
      setReviews([]);
      setServices([]);
      setLoading(false);
      return;
    }

    const apply = (payload: {
      hospedajes: AccommodationListItem[];
      reservas: Booking[];
      resenas: Review[];
      servicios: Service[];
    }) => {
      setMine(payload.hospedajes);
      setBookings(payload.reservas);
      setReviews(payload.resenas);
      setServices(payload.servicios);
      setLoading(false);
    };

    if (options?.silent) {
      if (options.skipCache) clearOwnerPanelBootstrapCache();
      void fetchOwnerPanelBootstrap().then(apply).catch(() => {});
      return;
    }

    if (!options?.skipCache) {
      const cached = loadCachedOwnerPanelBootstrap();
      if (cached) {
        apply(cached);
      } else {
        setLoading(true);
      }
    } else {
      clearOwnerPanelBootstrapCache();
      setLoading(true);
    }

    fetchOwnerPanelBootstrap()
      .then(apply)
      .catch((e) => {
        if (!loadCachedOwnerPanelBootstrap()) {
          setError(e instanceof Error ? e.message : "Error");
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    if (tab === "reservas") {
      load({ skipCache: true });
    } else {
      load();
    }
  }, [ownerApproved, tab]);

  const createAcc = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setMsg("");
    try {
      await api.post<AccommodationDetail>("/hospedajes/", formToPayload(form));
      clearOwnerPanelBootstrapCache();
      setMsg("Hospedaje enviado a revisión del administrador.");
      showOwnerToast("Hospedaje enviado a revisión del administrador.", "success");
      setForm(emptyAccommodationForm());
      goToTab("dashboard");
      load({ skipCache: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("Error al crear");
      }
    }
  };

  const bookingSuccessMessage: Record<
    "confirmar" | "rechazar" | "completar" | "cancelar",
    string
  > = {
    confirmar: "Estadía confirmada.",
    rechazar: "Reserva rechazada.",
    completar: "Estadía marcada como completada.",
    cancelar: "Reserva cancelada.",
  };

  const patchBookingAfterAction = (
    id: number,
    action: "confirmar" | "rechazar" | "completar" | "cancelar",
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        if (action === "confirmar") return { ...b, status: "confirmada" };
        if (action === "rechazar" || action === "cancelar") return { ...b, status: "cancelada" };
        if (action === "completar") return { ...b, status: "completada" };
        return b;
      }),
    );
  };

  const patchBookingAfterExternalPayment = (paymentId: number) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.payment?.id !== paymentId) return b;
        return {
          ...b,
          status: "confirmada",
          payment: {
            ...b.payment,
            status: "pagado",
            method: b.payment.method || "externo",
          },
        };
      }),
    );
  };

  const bookingAction = async (
    id: number,
    action: "confirmar" | "rechazar" | "completar" | "cancelar",
  ) => {
    const busyKey = `booking-${id}-${action}`;
    if (bookingBusy) return;
    setBookingBusy(busyKey);
    try {
      await api.post(`/reservas/${id}/${action}/`);
      patchBookingAfterAction(id, action);
      clearOwnerPanelBootstrapCache();
      load({ skipCache: true, silent: true });
      showOwnerToast(bookingSuccessMessage[action], "success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "No se pudo completar la acción";
      clearOwnerPanelBootstrapCache();
      load({ skipCache: true, silent: true });
      if (isOwnerBookingStaleActionError(msg)) {
        showOwnerToast(ownerBookingStaleActionToast(msg), "info");
      } else {
        showOwnerToast(msg, "error");
      }
    } finally {
      setBookingBusy(null);
    }
  };

  const confirmExternalPaymentAction = async (paymentId: number) => {
    if (
      !confirm(
        "¿Confirmas que recibiste el pago del huésped? La reserva quedará confirmada en Hospy.",
      )
    ) {
      return;
    }
    const busyKey = `payment-${paymentId}-externo`;
    if (bookingBusy) return;
    setBookingBusy(busyKey);
    try {
      await confirmExternalPayment(paymentId);
      patchBookingAfterExternalPayment(paymentId);
      clearOwnerPanelBootstrapCache();
      load({ skipCache: true, silent: true });
      showOwnerToast("Pago registrado y reserva confirmada.", "success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Error al confirmar el pago";
      clearOwnerPanelBootstrapCache();
      load({ skipCache: true, silent: true });
      if (isOwnerBookingStaleActionError(msg)) {
        showOwnerToast(ownerBookingStaleActionToast(msg), "info");
      } else {
        showOwnerToast(msg, "error");
      }
    } finally {
      setBookingBusy(null);
    }
  };

  const isBookingCardBusy = (bookingId: number) =>
    bookingBusy != null && bookingBusy.startsWith(`booking-${bookingId}-`);

  const isPaymentBusy = (paymentId: number) =>
    bookingBusy === `payment-${paymentId}-externo`;

  return (
    <div className="owner-panel-page">
      <OwnerToastHost />
      {ownerPending && (          <div className="owner-approval-banner" role="status">
            <h2>Cuenta en revisión</h2>
            <p className="muted">
              Un administrador está validando que seas un anfitrión o empresa legítima.
              Te avisaremos en la bandeja cuando tu cuenta sea aprobada.
            </p>
          </div>
        )}

        {ownerRejected && (
          <div
            className="owner-approval-banner owner-approval-banner--rejected"
            role="alert"
          >
            <h2>Cuenta no aprobada</h2>
            <p className="muted">
              {user?.owner_rejection_reason?.trim() ||
                "No pudimos validar tu solicitud. Revisa tus datos o contacta a soporte."}
            </p>
          </div>
        )}

        {ownerApproved && (
          <>
            {!ownerPayoutReady && (
              <div className="owner-approval-banner owner-payout-banner-panel" role="alert">
                <h2>Completa tus datos de cobro</h2>
                <p className="muted">
                  Los huéspedes no pueden reservar en tus hospedajes hasta que cargues tu
                  teléfono y DNI. Mercado Pago o CCI son opcionales (solo para cobro en línea).
                </p>
                <Link to="/perfil" className="btn btn-primary owner-payout-banner-link">
                  Ir a datos de cobro
                </Link>
              </div>
            )}

            <div className="owner-panel-alerts">
              {msg && <p className="owner-panel-msg owner-panel-msg--success">{msg}</p>}
              {error && <p className="owner-panel-msg owner-panel-msg--error">{error}</p>}
            </div>

            {loading && <p className="owner-panel-loading">Cargando…</p>}

            {tab === "dashboard" && !loading && (
              <OwnerDashboard
                properties={mine}
                bookings={bookings}
                reviews={reviews}
                unreadMessages={inboxSummary.mensajes}
                onViewReservations={() => goToTab("reservas")}
                onViewConsultas={() => goToTab("consultas")}              />
            )}

            {tab === "hospedajes" && !loading && (
              <OwnerPropertiesList
                properties={mine}
                bookings={bookings}
                onCreateNew={() => goToTab("nuevo")}              />
            )}

            {tab === "consultas" && !loading && (
              <OwnerInquiriesPanel
                initialConversationId={
                  searchParams.get("conversacion")
                    ? Number(searchParams.get("conversacion"))
                    : null
                }
              />
            )}

            {tab === "reservas" && !loading && (
              <section className="owner-bookings-section" aria-label="Reservas">
                <div className="owner-bookings-intro card">
                  <h2 className="owner-bookings-intro-title">Tus reservas</h2>
                  <p className="muted">
                    Cada tarjeta resume qué hizo el huésped y qué te falta por hacer.{" "}
                    <strong>Pago en Hospy</strong> = cobró la plataforma.{" "}
                    <strong>Pago directo</strong> = el huésped te paga por fuera y tú confirmas
                    cuando recibas el dinero.
                  </p>
                </div>
                {bookings.length === 0 ? (
                  <div className="owner-properties-empty owner-properties-empty--compact">
                    <h2>Sin reservas</h2>
                    <p className="muted">Cuando recibas reservas aparecerán aquí.</p>
                  </div>
                ) : (
                  bookings.map((b) => {
                    const hint = ownerBookingHint(b);
                    const awaitingExternal = ownerBookingAwaitingExternalPayment(b);
                    const showManualConfirm = ownerBookingShowManualConfirm(b);
                    const showExternalConfirm =
                      (awaitingExternal ||
                        (b.status === "confirmada" &&
                          b.payment?.method === "externo" &&
                          b.payment.status === "procesando")) &&
                      b.payment;

                    const cardBusy = isBookingCardBusy(b.id);
                    const paymentBusy = b.payment ? isPaymentBusy(b.payment.id) : false;

                    return (
                    <article key={b.id} className="owner-booking-card">
                      <div className="owner-booking-card-head">
                        <h3>
                          {b.accommodation_id != null ? (
                            <Link
                              to={`/hospedajes/${b.accommodation_id}`}
                              className="booking-item-title-link"
                            >
                              {b.hospedaje}
                            </Link>
                          ) : (
                            b.hospedaje
                          )}{" "}
                          · Hab. {b.habitacion}
                        </h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p>
                        {b.huesped.nombre} ({b.huesped.email})
                      </p>
                      <p>
                        {formatDate(b.check_in)} → {formatDate(b.check_out)} ·{" "}
                        {formatMoney(b.total_amount)}
                      </p>
                      {b.payment && (
                        <p className="owner-booking-payment">
                          {ownerBookingPaymentLabel(b.payment)}
                        </p>
                      )}
                      {hint && <OwnerBookingHintBox hint={hint} />}
                      <div className="owner-booking-card-actions">
                        {showExternalConfirm && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={Boolean(bookingBusy)}
                              onClick={() => confirmExternalPaymentAction(b.payment!.id)}
                            >
                              {paymentBusy ? "Procesando…" : "Confirmar pago recibido"}
                            </button>
                          )}
                        {showManualConfirm && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={Boolean(bookingBusy)}
                              onClick={() => bookingAction(b.id, "confirmar")}
                            >
                              {cardBusy ? "Procesando…" : "Confirmar estadía"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={Boolean(bookingBusy)}
                              onClick={() => bookingAction(b.id, "rechazar")}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {awaitingExternal && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={Boolean(bookingBusy)}
                            onClick={() => bookingAction(b.id, "rechazar")}
                          >
                            Rechazar
                          </button>
                        )}
                        {b.status === "confirmada" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={Boolean(bookingBusy)}
                              onClick={() => bookingAction(b.id, "completar")}
                            >
                              {cardBusy ? "Procesando…" : "Marcar completada"}
                            </button>
                            {b.can_cancel && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={Boolean(bookingBusy)}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      "¿Cancelar esta reserva? El huésped será notificado.",
                                    )
                                  ) {
                                    return;
                                  }
                                  void bookingAction(b.id, "cancelar");
                                }}
                              >
                                Cancelar reserva
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                    );
                  })
                )}
              </section>
            )}

            {tab === "nuevo" && (
              <div className="owner-panel-form-wrap">
                <AccommodationForm
                  value={form}
                  onChange={setForm}
                  services={services}
                  onServicesChange={setServices}
                  fieldErrors={fieldErrors}
                  submitLabel="Enviar a revisión"
                  onSubmit={createAcc}
                  onCancel={() => goToTab("dashboard")}
                />
              </div>
            )}
          </>
        )}
    </div>
  );
}