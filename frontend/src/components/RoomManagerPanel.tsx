import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import { formatApiError, parseFieldErrors } from "../api/errors";
import { unwrapList } from "../api/unwrap";
import type { Paginated, Room, Service } from "../api/types";
import { RoomPhotoSection } from "./RoomPhotoSection";
import { formatMoney, roomTypeLabel } from "../utils/format";
import { isWholeUnitPricing } from "../utils/pricingModel";

const ROOM_TYPES = [
  { value: "simple", label: "Simple" },
  { value: "doble", label: "Doble" },
  { value: "suite", label: "Suite" },
  { value: "familiar", label: "Familiar" },
] as const;

export interface RoomFormData {
  number: string;
  type: string;
  capacity: string;
  floor: string;
  description: string;
  base_price: string;
  service_ids: number[];
}

const emptyRoomForm = (): RoomFormData => ({
  number: "",
  type: "doble",
  capacity: "2",
  floor: "1",
  description: "",
  base_price: "",
  service_ids: [],
});

interface Props {
  accommodationId: number;
  accommodationStatus: string;
  accommodationType?: string;
  services: Service[];
  onServicesChange?: (services: Service[]) => void;
  onChanged?: () => void;
}

export function RoomManagerPanel({
  accommodationId,
  accommodationStatus,
  accommodationType,
  services,
  onServicesChange,
  onChanged,
}: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const wholeUnit = isWholeUnitPricing(accommodationType);
  const activeRooms = rooms.filter((r) => r.is_active !== false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyRoomForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formHint, setFormHint] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [serviceError, setServiceError] = useState("");

  const canManage = accommodationStatus === "aprobado";

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get<Room[] | Paginated<Room>>(`/habitaciones/?accommodation=${accommodationId}`)
      .then((data) => setRooms(unwrapList(data)))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar las habitaciones"),
      )
      .finally(() => setLoading(false));
  }, [accommodationId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(
      wholeUnit
        ? {
            ...emptyRoomForm(),
            number: "Completo",
            type: "familiar",
            capacity: "6",
          }
        : emptyRoomForm(),
    );
    setFieldErrors({});
    setFormHint("");
    setFormOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      number: room.number,
      type: room.type,
      capacity: String(room.capacity),
      floor: room.floor != null ? String(room.floor) : "1",
      description: room.description ?? "",
      base_price: String(room.base_price),
      service_ids: room.services?.map((s) => s.id) ?? [],
    });
    setFieldErrors({});
    setFormHint("");
    setFormOpen(true);
  };

  const cancelForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyRoomForm());
    setFieldErrors({});
    setFormHint("");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError("");
    setFieldErrors({});

    const payload = {
      number: form.number.trim(),
      type: form.type,
      capacity: Number(form.capacity),
      floor: Number(form.floor) || 1,
      description: form.description.trim(),
      base_price: form.base_price,
      service_ids: form.service_ids,
    };

    try {
      if (editingId) {
        await api.patch<Room>(`/habitaciones/${editingId}/`, payload);
        setFormHint("Cambios guardados.");
        load();
        onChanged?.();
      } else {
        const created = await api.post<Room>(`/hospedajes/${accommodationId}/habitaciones/`, {
          ...payload,
          accommodation: accommodationId,
        });
        setEditingId(created.id);
        setFormHint("Habitación creada. Añade fotos abajo y cierra cuando termines.");
        load();
        onChanged?.();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("Error al guardar la habitación");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (room: Room) => {
    if (!confirm(`¿Eliminar la habitación ${room.number}? Dejará de mostrarse en reservas.`)) {
      return;
    }
    try {
      await api.delete(`/habitaciones/${room.id}/`);
      load();
      onChanged?.();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo eliminar");
    }
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
      if (!form.service_ids.includes(created.id)) {
        setForm((prev) => ({
          ...prev,
          service_ids: [...prev.service_ids, created.id],
        }));
      }
      setNewServiceName("");
    } catch (err) {
      setServiceError(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setAddingService(false);
    }
  };

  const toggleActive = async (room: Room) => {
    const action = room.is_active ? "desactivar" : "activar";
    try {
      await api.post<Room>(`/habitaciones/${room.id}/${action}/`);
      load();
      onChanged?.();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  return (
    <section className="card section-sm room-manager">
      <div className="room-manager-head">
        <div>
          <h2>{wholeUnit ? "Precio del alojamiento completo" : "Habitaciones"}</h2>
          <p className="muted">
            {wholeUnit
              ? "Define capacidad, precio por noche del espacio completo y servicios incluidos (estilo Airbnb)."
              : "Define tipos, capacidad, precio por habitación y servicios. Si hay tarifas de temporada, se recalculan al guardar el precio base."}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
            disabled={(formOpen && !editingId) || (wholeUnit && activeRooms.length >= 1)}
          >
            {wholeUnit ? "Configurar alojamiento" : "Añadir habitación"}
          </button>
        )}
      </div>

      {!canManage && (
        <p className="muted room-manager-hint">
          Cuando el administrador apruebe el hospedaje podrás registrar habitaciones.
        </p>
      )}

      {error && <p className="error-msg">{error}</p>}

      {formOpen && canManage && (
        <form className="room-form card-inner" onSubmit={save}>
          <h3>{editingId ? (wholeUnit ? "Editar alojamiento" : "Editar habitación") : wholeUnit ? "Alojamiento completo" : "Nueva habitación"}</h3>
          {formHint && <p className="success-msg">{formHint}</p>}
          <div className="form-grid room-form-grid">
            <label>
              Número / código
              <input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="Ej. 101, A-2"
                required
                maxLength={20}
              />
              {fieldErrors.number && <span className="field-error">{fieldErrors.number}</span>}
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Capacidad (personas)
              <input
                type="number"
                min={1}
                max={20}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
              {fieldErrors.capacity && (
                <span className="field-error">{fieldErrors.capacity}</span>
              )}
            </label>
            <label>
              Piso
              <input
                type="number"
                min={0}
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
              />
            </label>
            <label className="full">
              {wholeUnit ? "Precio por noche — alojamiento completo (S/)" : "Precio por noche (S/)"}
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                required
              />
              {fieldErrors.base_price && (
                <span className="field-error">{fieldErrors.base_price}</span>
              )}
            </label>
            <label className="full">
              Descripción
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Vista, camas, baño privado…"
              />
            </label>
            <fieldset className="full services-fieldset">
              <legend>Servicios de esta habitación</legend>
              {services.length > 0 ? (
                <ul className="services-list">
                  {services.map((s) => (
                    <li key={s.id} className="service-list-item">
                      <label className="checkbox-label service-check-label">
                        <input
                          type="checkbox"
                          checked={form.service_ids.includes(s.id)}
                          onChange={() => {
                            const next = form.service_ids.includes(s.id)
                              ? form.service_ids.filter((id) => id !== s.id)
                              : [...form.service_ids, s.id];
                            setForm({ ...form, service_ids: next });
                          }}
                        />
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted services-empty">
                  Aún no hay servicios en el catálogo. Agrega el primero abajo.
                </p>
              )}
              <div className="add-service-row">
                <input
                  type="text"
                  placeholder="Nuevo servicio, ej. Jacuzzi, Minibar…"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addService();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={addingService}
                  onClick={() => void addService()}
                >
                  {addingService ? "Agregando…" : "+ Agregar servicio"}
                </button>
              </div>
              {serviceError && <p className="field-error">{serviceError}</p>}
              <p className="hint">
                Marca solo lo que incluye esta habitación. El precio por noche lo defines tú
                en «Precio base»; no se calcula solo por los servicios marcados.
              </p>
            </fieldset>
          </div>

          {editingId && <RoomPhotoSection roomId={editingId} />}

          {!editingId && (
            <p className="muted room-photos-create-hint">
              Guarda la habitación primero; después podrás subir fotos.
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : wholeUnit ? "Guardar alojamiento" : "Crear habitación"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando habitaciones…</p>
      ) : rooms.length === 0 ? (
        <p className="muted">
          {canManage
            ? wholeUnit
              ? "Configura el precio del alojamiento completo con el botón de arriba."
              : "Aún no hay habitaciones. Pulsa «Añadir habitación» para publicar la primera."
            : wholeUnit
              ? "Sin precio configurado."
              : "Sin habitaciones registradas."}
        </p>
      ) : (
        <div className="room-table-wrap">
          <table className="room-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Tipo</th>
                <th>Cap.</th>
                <th>Piso</th>
                <th>{wholeUnit ? "Precio / noche (completo)" : "Precio / noche"}</th>
                <th>Servicios</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className={!r.is_active ? "room-row-inactive" : undefined}>
                  <td>
                    <strong>{r.number}</strong>
                  </td>
                  <td>{roomTypeLabel(r.type)}</td>
                  <td>{r.capacity}</td>
                  <td>{r.floor ?? "—"}</td>
                  <td>{formatMoney(r.base_price)}</td>
                  <td className="room-services-cell">
                    {(r.services ?? []).length > 0 ? (
                      <span className="room-services-preview" title={(r.services ?? []).map((s) => s.name).join(", ")}>
                        {(r.services ?? [])
                          .slice(0, 3)
                          .map((s) => s.name)
                          .join(" · ")}
                        {(r.services ?? []).length > 3
                          ? ` +${(r.services ?? []).length - 3}`
                          : ""}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`room-status ${r.is_active ? "room-status-active" : "room-status-paused"}`}
                    >
                      {r.is_active ? "Activa" : "Pausada"}
                    </span>
                  </td>
                  <td className="room-actions">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(r)}
                        >
                          Editar
                        </button>
                        {r.is_active ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleActive(r)}
                          >
                            Pausar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleActive(r)}
                          >
                            Activar
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm room-delete-btn"
                          onClick={() => remove(r)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
