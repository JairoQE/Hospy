import { useState } from "react";
import { ApiError, api } from "../api/client";
import type { AccommodationFaqInput, Service } from "../api/types";
import { AccommodationFaqEditor } from "./AccommodationFaqEditor";
import { LocationPickerModal, type LocationPickResult } from "./LocationPickerModal";
import { formatCoordinate } from "../utils/coordinates";
import { REFUND_POLICY_OPTIONS, type RefundPolicyType } from "../utils/refundPolicy";

export interface AccommodationFormData {
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
  service_ids: number[];
  check_in_from: string;
  check_out_until: string;
  check_in_instructions: string;
  check_out_instructions: string;
  cancellation_policy_notes: string;
  refund_policy_type: RefundPolicyType;
  refund_hours_before_full: string;
  refund_policy_notes: string;
  cancel_hours_before_checkin: string;
  refund_processing_days: string;
  faqs: AccommodationFaqInput[];
}

export const emptyAccommodationForm = (): AccommodationFormData => ({
  name: "",
  type: "hostal",
  description: "",
  address: "",
  city: "",
  region: "",
  country: "Perú",
  latitude: "-12.046400",
  longitude: "-77.042800",
  service_ids: [],
  check_in_from: "13:00",
  check_out_until: "11:00",
  check_in_instructions: "",
  check_out_instructions: "",
  cancellation_policy_notes: "",
  refund_policy_type: "flexible",
  refund_hours_before_full: "48",
  refund_policy_notes: "",
  cancel_hours_before_checkin: "48",
  refund_processing_days: "3",
  faqs: [],
});

interface Props {
  value: AccommodationFormData;
  onChange: (data: AccommodationFormData) => void;
  services: Service[];
  onServicesChange?: (services: Service[]) => void;
  fieldErrors?: Record<string, string>;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

export function AccommodationForm({
  value,
  onChange,
  services,
  onServicesChange,
  fieldErrors = {},
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const set = <K extends keyof AccommodationFormData>(key: K, val: AccommodationFormData[K]) =>
    onChange({ ...value, [key]: val });

  const applyLocation = (loc: LocationPickResult) => {
    onChange({
      ...value,
      latitude: formatCoordinate(loc.latitude),
      longitude: formatCoordinate(loc.longitude),
      address: loc.address?.trim() ? loc.address : value.address,
      city: loc.city?.trim() ? loc.city : value.city,
      region: loc.region?.trim() ? loc.region : value.region,
    });
  };

  const latNum = parseFloat(value.latitude) || -12.0464;
  const lngNum = parseFloat(value.longitude) || -77.0428;
  const searchHint = [value.address, value.city, value.region, value.country]
    .filter(Boolean)
    .join(", ");

  const toggleService = (id: number) => {
    const ids = value.service_ids.includes(id)
      ? value.service_ids.filter((x) => x !== id)
      : [...value.service_ids, id];
    set("service_ids", ids);
  };

  const addService = async () => {
    const name = newServiceName.trim();
    if (name.length < 2) {
      setServiceError("Escribe un nombre de al menos 2 caracteres.");
      return;
    }
    setAddingService(true);
    setServiceError("");
    try {
      const created = await api.post<Service>("/servicios/", { name });
      const updated = [...services, created].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      onServicesChange?.(updated);
      if (!value.service_ids.includes(created.id)) {
        set("service_ids", [...value.service_ids, created.id]);
      }
      setNewServiceName("");
    } catch (err) {
      setServiceError(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setAddingService(false);
    }
  };

  const startEdit = (s: Service) => {
    setEditingSlug(s.slug);
    setEditName(s.name);
    setServiceError("");
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setEditName("");
  };

  const saveEdit = async (s: Service) => {
    const name = editName.trim();
    if (name.length < 2) {
      setServiceError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setSavingEdit(true);
    setServiceError("");
    try {
      const updated = await api.patch<Service>(`/servicios/${s.slug}/`, { name });
      const list = services
        .filter((x) => x.id !== s.id)
        .concat(updated)
        .sort((a, b) => a.name.localeCompare(b.name));
      onServicesChange?.(list);
      setEditingSlug(null);
      setEditName("");
    } catch (err) {
      setServiceError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteService = async (s: Service) => {
    if (
      !confirm(
        `¿Eliminar el servicio «${s.name}»? Dejará de aparecer en el catálogo (los hospedajes ya guardados no se borran).`,
      )
    ) {
      return;
    }
    setDeletingSlug(s.slug);
    setServiceError("");
    try {
      await api.delete(`/servicios/${s.slug}/`);
      onServicesChange?.(services.filter((x) => x.id !== s.id));
      set(
        "service_ids",
        value.service_ids.filter((id) => id !== s.id),
      );
      if (editingSlug === s.slug) cancelEdit();
    } catch (err) {
      setServiceError(err instanceof ApiError ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <form className="card form-grid accommodation-form" onSubmit={onSubmit}>
      <label>
        Nombre
        <input
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
      </label>
      <label>
        Tipo
        <select value={value.type} onChange={(e) => set("type", e.target.value)}>
          <option value="hotel">Hotel</option>
          <option value="hostal">Hostal</option>
          <option value="hospedaje">Hospedaje</option>
          <option value="casa_departamento">Casa o departamento</option>
        </select>
        {value.type === "casa_departamento" && (
          <span className="muted form-hint">
            Alquiler del espacio completo: el precio lo defines en «Precio del alojamiento completo» (no por habitación suelta).
          </span>
        )}
        {(value.type === "hotel" || value.type === "hostal" || value.type === "hospedaje") && (
          <span className="muted form-hint">
            El precio se configura por habitación en la sección Habitaciones (no hay precio fijo del hospedaje).
          </span>
        )}
      </label>
      <label className="full">
        Descripción
        <textarea
          rows={4}
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          required
        />
        {fieldErrors.description && (
          <span className="field-error">{fieldErrors.description}</span>
        )}
      </label>
      <label>
        Dirección
        <input
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          required
        />
      </label>
      <label>
        Ciudad
        <input value={value.city} onChange={(e) => set("city", e.target.value)} required />
      </label>
      <label>
        Región
        <input
          value={value.region}
          onChange={(e) => set("region", e.target.value)}
          required
        />
      </label>
      <label>
        País
        <input
          value={value.country}
          onChange={(e) => set("country", e.target.value)}
          required
        />
      </label>
      <div className="full location-fields check-policy-fields">
        <p className="location-fields-label">Políticas de entrada y salida (este hospedaje)</p>
        <p className="hint">
          Cada local tiene sus propias reglas. Si administras varios hospedajes, configúralas por
          separado al editar cada uno.
        </p>
        <div className="location-fields-row">
          <label>
            Check-in desde
            <input
              type="time"
              value={value.check_in_from}
              onChange={(e) => set("check_in_from", e.target.value)}
              required
            />
          </label>
          <label>
            Check-out hasta
            <input
              type="time"
              value={value.check_out_until}
              onChange={(e) => set("check_out_until", e.target.value)}
              required
            />
          </label>
        </div>
        <p className="hint">
          Horarios por defecto: entrada 13:00 y salida 11:00. Ajusta según tu operación.
        </p>
        <label className="full">
          Instrucciones de check-in (opcional)
          <textarea
            rows={3}
            value={value.check_in_instructions}
            onChange={(e) => set("check_in_instructions", e.target.value)}
            placeholder="Ej.: Recepción en planta baja. Presentar DNI. Llaves en locker con código."
          />
        </label>
        <label className="full">
          Instrucciones de check-out (opcional)
          <textarea
            rows={3}
            value={value.check_out_instructions}
            onChange={(e) => set("check_out_instructions", e.target.value)}
            placeholder="Ej.: Dejar llaves en recepción. Avisar con 1 h de anticipación."
          />
        </label>
        <label className="full">
          Política de cancelación de tu local (opcional)
          <textarea
            rows={3}
            value={value.cancellation_policy_notes}
            onChange={(e) => set("cancellation_policy_notes", e.target.value)}
            placeholder="Ej.: No reembolsable en temporada alta. Cambio de fecha sin costo con 7 días de aviso."
          />
        </label>
      </div>
      <div className="full location-fields check-policy-fields">
        <p className="location-fields-label">Política de reembolso (este hospedaje)</p>
        <p className="hint">
          No se hereda de otros locales del mismo propietario: aplica solo a las reservas de este
          alojamiento.
        </p>
        <label className="full">
          Tipo de reembolso
          <select
            value={value.refund_policy_type}
            onChange={(e) => set("refund_policy_type", e.target.value as RefundPolicyType)}
          >
            {REFUND_POLICY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">
          {
            REFUND_POLICY_OPTIONS.find((o) => o.value === value.refund_policy_type)?.hint
          }
        </p>
        {value.refund_policy_type === "flexible" && (
          <label>
            Horas de anticipación para reembolso completo
            <input
              type="number"
              min={1}
              max={720}
              value={value.refund_hours_before_full}
              onChange={(e) => set("refund_hours_before_full", e.target.value)}
            />
          </label>
        )}
        <label className="full">
          Detalle adicional de reembolso{" "}
          {value.refund_policy_type === "custom" ? "(obligatorio)" : "(opcional)"}
          <textarea
            rows={3}
            value={value.refund_policy_notes}
            onChange={(e) => set("refund_policy_notes", e.target.value)}
            placeholder={
              value.refund_policy_type === "custom"
                ? "Ej.: 70 % hasta 72 h antes; transferencia en 5 días hábiles."
                : "Ej.: Reembolsos solo por transferencia bancaria. Temporada alta sin devolución."
            }
            required={value.refund_policy_type === "custom"}
          />
        </label>
        <div className="location-fields-row">
          <label>
            Horas antes del check-in para cancelar (huésped)
            <input
              type="number"
              min={1}
              max={720}
              value={value.cancel_hours_before_checkin}
              onChange={(e) => set("cancel_hours_before_checkin", e.target.value)}
              placeholder="48"
            />
          </label>
          <label>
            Días para registrar reembolso tras cancelación (1–7)
            <input
              type="number"
              min={1}
              max={7}
              value={value.refund_processing_days}
              onChange={(e) => set("refund_processing_days", e.target.value)}
              required
            />
          </label>
        </div>
        <p className="hint">
          El reembolso es directo (fuera de la app): tú transfieres al huésped y registras número
          de operación y monto. Si no cumples el plazo, el huésped puede reportarlo a moderación.
        </p>
      </div>
      <div className="full location-fields">
        <p className="location-fields-label">Ubicación GPS</p>
        <div className="location-fields-row">
          <label>
            Latitud
            <input
              type="number"
              step="0.000001"
              value={value.latitude}
              onChange={(e) => set("latitude", e.target.value)}
              onBlur={(e) => set("latitude", formatCoordinate(e.target.value))}
              required
            />
          </label>
          <label>
            Longitud
            <input
              type="number"
              step="0.000001"
              value={value.longitude}
              onChange={(e) => set("longitude", e.target.value)}
              onBlur={(e) => set("longitude", formatCoordinate(e.target.value))}
              required
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-ghost location-pick-btn"
          onClick={() => setPickerOpen(true)}
        >
          Seleccionar en el mapa
        </button>
        <p className="hint">
          Busca la dirección, marca el pin o abre Google Maps para verificar. Los campos se
          actualizan al confirmar.
        </p>
        <LocationPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          latitude={latNum}
          longitude={lngNum}
          searchHint={searchHint}
          onConfirm={applyLocation}
        />
      </div>
      <fieldset className="full services-fieldset">
        <legend>Servicios</legend>
        {services.length > 0 ? (
          <ul className="services-list">
            {services.map((s) => (
              <li key={s.id} className="service-list-item">
                {editingSlug === s.slug ? (
                  <div className="service-edit-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit(s);
                        }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={savingEdit}
                      onClick={() => saveEdit(s)}
                    >
                      {savingEdit ? "…" : "Guardar"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="checkbox-label service-check-label">
                      <input
                        type="checkbox"
                        checked={value.service_ids.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      {s.name}
                    </label>
                    <div className="service-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(s)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm service-delete-btn"
                        disabled={deletingSlug === s.slug}
                        onClick={() => deleteService(s)}
                      >
                        {deletingSlug === s.slug ? "…" : "Eliminar"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted services-empty">Aún no hay servicios. Agrega el primero abajo.</p>
        )}
        <div className="add-service-row">
          <input
            type="text"
            placeholder="Nuevo servicio, ej. Jacuzzi, Lavandería…"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={addingService}
            onClick={addService}
          >
            {addingService ? "Agregando…" : "+ Agregar servicio"}
          </button>
        </div>
        {serviceError && <p className="field-error">{serviceError}</p>}
        <p className="hint">
          Marca los que ofrece tu hospedaje. Puedes editar o eliminar servicios del catálogo
          compartido.
        </p>
      </fieldset>
      <AccommodationFaqEditor
        value={value.faqs}
        onChange={(faqs) => set("faqs", faqs)}
        propertyName={value.name.trim() || undefined}
      />
      <div className="full btn-row form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Guardando…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
