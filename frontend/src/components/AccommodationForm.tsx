import { useState } from "react";
import { ApiError, api } from "../api/client";
import type { AccommodationFaqInput, Service } from "../api/types";
import { AccommodationFaqEditor } from "./AccommodationFaqEditor";
import { LocationPickerModal, type LocationPickResult } from "./LocationPickerModal";
import { formatCoordinate } from "../utils/coordinates";

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
        </select>
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
                    <label className="checkbox-label service-check">
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
