import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { unwrapList } from "../api/unwrap";
import { formatApiError, parseFieldErrors } from "../api/errors";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Paginated,
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
  const { user, isOwnerApproved } = useAuth();
  const ownerApproved = isOwnerApproved();
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

  const load = () => {
    if (!ownerApproved) {
      setMine([]);
      setBookings([]);
      setReviews([]);
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<Paginated<AccommodationListItem> | AccommodationListItem[]>(
        "/hospedajes/mios/",
      ),
      api.get<Paginated<Booking> | Booking[]>("/reservas/propietario/"),
      api
        .get<Service[] | Paginated<Service>>("/servicios/", false)
        .then((data) => unwrapList(data)),
    ])
      .then(async ([h, b, svc]) => {
        const list = Array.isArray(h) ? h : h.results;
        setMine(list);
        setBookings(Array.isArray(b) ? b : b.results);
        setServices(svc);
        const reviewLists = await Promise.all(
          list
            .filter((p) => p.status === "aprobado")
            .map((p) =>
              api
                .get<Review[] | Paginated<Review>>(`/hospedajes/${p.id}/resenas/`, false)
                .then((data) => (Array.isArray(data) ? data : data.results))
                .catch(() => [] as Review[]),
            ),
        );
        setReviews(reviewLists.flat());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [ownerApproved]);

  const createAcc = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setMsg("");
    try {
      await api.post<AccommodationDetail>("/hospedajes/", formToPayload(form));
      setMsg("Hospedaje enviado a revisión del administrador.");
      setForm(emptyAccommodationForm());
      goToTab("dashboard");
      load();    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("Error al crear");
      }
    }
  };

  const bookingAction = async (
    id: number,
    action: "confirmar" | "rechazar" | "completar" | "cancelar",
  ) => {
    try {
      await api.post(`/reservas/${id}/${action}/`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  return (
    <div className="owner-panel-page">
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
                {bookings.length === 0 ? (
                  <div className="owner-properties-empty owner-properties-empty--compact">
                    <h2>Sin reservas</h2>
                    <p className="muted">Cuando recibas reservas aparecerán aquí.</p>
                  </div>
                ) : (
                  bookings.map((b) => (
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
                      <div className="owner-booking-card-actions">
                        {b.status === "pendiente" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => bookingAction(b.id, "confirmar")}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => bookingAction(b.id, "rechazar")}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {b.status === "confirmada" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => bookingAction(b.id, "completar")}
                            >
                              Marcar completada
                            </button>
                            {b.can_cancel && (
                              <button
                                type="button"
                                className="btn btn-ghost"
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
                  ))
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