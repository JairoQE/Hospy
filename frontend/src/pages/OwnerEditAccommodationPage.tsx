import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import { formatApiError, parseFieldErrors } from "../api/errors";
import { formatCoordinate } from "../utils/coordinates";
import { resolveMediaUrl } from "../utils/media";
import type {
  AccommodationDetail,
  AccommodationPhoto,
  Paginated,
  Service,
} from "../api/types";
import { PrimeIcon } from "../components/PrimeIcon";
import {
  AccommodationForm,
  emptyAccommodationForm,
  type AccommodationFormData,
} from "../components/AccommodationForm";
import { OwnerOffersPanel } from "../components/OwnerOffersPanel";
import { RoomManagerPanel } from "../components/RoomManagerPanel";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonFormPage } from "../components/ui/Skeleton";
import "../styles/owner-panel.css";

function detailToForm(d: AccommodationDetail): AccommodationFormData {
  return {
    name: d.name,
    type: d.type,
    description: d.description,
    address: d.address,
    city: d.city,
    region: d.region,
    country: d.country,
    latitude: String(d.latitude),
    longitude: String(d.longitude),
    service_ids: d.services.map((s) => s.id),
    check_in_from: (d.check_in_from ?? "13:00").slice(0, 5),
    check_out_until: (d.check_out_until ?? "11:00").slice(0, 5),
    check_in_instructions: d.check_in_instructions ?? "",
    check_out_instructions: d.check_out_instructions ?? "",
    cancellation_policy_notes: d.cancellation_policy_notes ?? "",
    refund_policy_type: (d.refund_policy_type ?? "flexible") as AccommodationFormData["refund_policy_type"],
    refund_hours_before_full:
      d.refund_hours_before_full != null ? String(d.refund_hours_before_full) : "48",
    refund_policy_notes: d.refund_policy_notes ?? "",
    faqs: (d.faqs ?? []).map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
  };
}

function faqsPayload(form: AccommodationFormData) {
  return form.faqs
    .filter((f) => f.question.trim() && f.answer.trim())
    .map((f) => ({
      question: f.question.trim(),
      answer: f.answer.trim(),
    }));
}

function formToPayload(form: AccommodationFormData) {
  const hours =
    form.refund_policy_type === "flexible" && form.refund_hours_before_full.trim()
      ? Number(form.refund_hours_before_full)
      : null;
  return {
    ...form,
    latitude: formatCoordinate(form.latitude),
    longitude: formatCoordinate(form.longitude),
    service_ids: form.service_ids,
    refund_hours_before_full: hours,
    faqs: faqsPayload(form),
  };
}

export function OwnerEditAccommodationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AccommodationDetail | null>(null);
  const [form, setForm] = useState(emptyAccommodationForm);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      api.get<AccommodationDetail>(`/hospedajes/${id}/`),
      api
        .get<Service[] | Paginated<Service>>("/servicios/", false)
        .then((data) => unwrapList(data)),
    ])
      .then(([acc, svc]) => {
        setDetail(acc);
        setForm(detailToForm(acc));
        setServices(svc);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    setFieldErrors({});
    setMsg("");
    try {
      await api.patch(`/hospedajes/${id}/`, formToPayload(form));
      setMsg("Cambios guardados.");
      if (detail?.status === "rechazado") {
        setMsg("Cambios guardados. El hospedaje volvió a estado pendiente de revisión.");
      }
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!id || !detail) return;
    const action = detail.is_active ? "desactivar" : "activar";
    try {
      const updated = await api.post<AccommodationDetail>(
        `/hospedajes/${id}/${action}/`,
      );
      setDetail(updated);
      setMsg(detail.is_active ? "Hospedaje pausado." : "Hospedaje activado.");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!id) return;
    setUploading(true);
    const body = new FormData();
    body.append("image", file);
    body.append("is_primary", detail?.fotos.length ? "false" : "true");
    try {
      await api.post<AccommodationPhoto>(`/hospedajes/${id}/fotos/`, body);
      setMsg("Foto subida.");
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (fotoId: number) => {
    if (!id || !confirm("¿Eliminar esta foto?")) return;
    try {
      await api.delete(`/hospedajes/${id}/fotos/${fotoId}/`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  if (loading) {
    return (
      <div className="owner-panel-page">
        <SkeletonFormPage fields={10} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="owner-panel-page">
        <p className="owner-panel-msg owner-panel-msg--error">{error || "Hospedaje no encontrado"}</p>
        <Link to="/panel?tab=hospedajes" className="owner-edit-back-link">
          Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="owner-panel-page">
      <Link to="/panel?tab=hospedajes" className="owner-edit-back-link">
        <PrimeIcon name="pi-arrow-left" size={14} /> Volver a mis hospedajes
      </Link>
      <header className="owner-edit-header">
        <h1 className="owner-page-title">Editar: {detail.name}</h1>
        <StatusBadge status={detail.status} />
      </header>

      {detail.status === "rechazado" && detail.rejection_reason && (
        <p className="owner-panel-msg owner-panel-msg--error">
          <strong>Motivo del rechazo:</strong> {detail.rejection_reason}
          <br />
          <span className="muted">Corrige los datos y guarda para reenviar a revisión.</span>
        </p>
      )}

      {msg && <p className="owner-panel-msg owner-panel-msg--success">{msg}</p>}
      {error && <p className="owner-panel-msg owner-panel-msg--error">{error}</p>}

      <div className="owner-panel-form-wrap">
      <AccommodationForm
        value={form}
        onChange={setForm}
        services={services}
        onServicesChange={setServices}
        fieldErrors={fieldErrors}
        submitLabel="Guardar cambios"
        loading={saving}
        onSubmit={save}
        onCancel={() => navigate("/panel?tab=hospedajes")}
      />
      </div>

      {detail.status === "aprobado" && (
        <div className="owner-edit-section">
          <h2>Visibilidad</h2>
          <p className="muted">
            {detail.is_active
              ? "Tu hospedaje está visible para los huéspedes."
              : "Tu hospedaje está pausado y no aparece en búsquedas."}
          </p>
          <button type="button" className="btn btn-ghost" onClick={toggleActive}>
            {detail.is_active ? "Pausar publicación" : "Activar publicación"}
          </button>
        </div>
      )}

      <RoomManagerPanel
        accommodationId={Number(id)}
        accommodationStatus={detail.status}
        accommodationType={detail.type}
        services={services}
        onServicesChange={setServices}
      />

      <OwnerOffersPanel
        accommodationId={Number(id)}
        accommodationStatus={detail.status}
      />

      <section className="owner-edit-section">
        <h2>Fotos</h2>
        <p className="muted">Máximo 10 fotos. La primera puede marcarse como principal al crear.</p>
        <div className="photo-grid">
          {detail.fotos.map((f) => (
            <div key={f.id} className="photo-thumb">
              <img
                src={resolveMediaUrl(f.image_url ?? f.image)}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              {f.is_primary && <span className="photo-badge">Principal</span>}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => deletePhoto(f.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        <label className="upload-label">
          <span className="btn btn-ghost">{uploading ? "Subiendo…" : "Añadir foto"}</span>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={uploading || detail.fotos.length >= 10}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      <p className="muted">
        <Link to={`/hospedajes/${id}`}>Ver ficha pública</Link>
      </p>
    </div>
  );
}
