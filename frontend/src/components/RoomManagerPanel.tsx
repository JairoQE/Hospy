import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import { formatApiError, parseFieldErrors } from "../api/errors";
import { unwrapList } from "../api/unwrap";
import type { Paginated, Room } from "../api/types";
import { RoomPhotoSection } from "./RoomPhotoSection";
import { formatMoney, roomTypeLabel } from "../utils/format";

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
}

const emptyRoomForm = (): RoomFormData => ({
  number: "",
  type: "doble",
  capacity: "2",
  floor: "1",
  description: "",
  base_price: "",
});

interface Props {
  accommodationId: number;
  accommodationStatus: string;
  onChanged?: () => void;
}

export function RoomManagerPanel({
  accommodationId,
  accommodationStatus,
  onChanged,
}: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyRoomForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formHint, setFormHint] = useState("");

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
    setForm(emptyRoomForm());
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
          <h2>Habitaciones</h2>
          <p className="muted">
            Define tipos, capacidad y precio base por noche. Los huéspedes reservan por habitación.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
            disabled={formOpen && !editingId}
          >
            Añadir habitación
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
          <h3>{editingId ? "Editar habitación" : "Nueva habitación"}</h3>
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
              Precio base / noche (S/)
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
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear habitación"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando habitaciones…</p>
      ) : rooms.length === 0 ? (
        <p className="muted">
          {canManage
            ? "Aún no hay habitaciones. Pulsa «Añadir habitación» para publicar la primera."
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
                <th>Precio / noche</th>
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
