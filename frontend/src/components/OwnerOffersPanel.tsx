import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api/client";
import { formatApiError, parseFieldErrors } from "../api/errors";
import { unwrapList } from "../api/unwrap";
import type { AccommodationOffer, Paginated, Room } from "../api/types";
import { roomTypeLabel } from "../utils/format";

const emptyForm = () => ({
  title: "",
  discount_percent: "15",
  start_date: new Date().toISOString().slice(0, 10),
  duration_days: "7",
  room_ids: [] as number[],
});

interface Props {
  accommodationId: number;
  accommodationStatus: string;
}

export function OwnerOffersPanel({ accommodationId, accommodationStatus }: Props) {
  const [offers, setOffers] = useState<AccommodationOffer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const canManage = accommodationStatus === "aprobado";

  const loadOffers = useCallback(() => {
    return api
      .get<AccommodationOffer[]>(`/hospedajes/${accommodationId}/ofertas/`)
      .then(setOffers);
  }, [accommodationId]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      loadOffers(),
      api
        .get<Room[] | Paginated<Room>>(`/habitaciones/?accommodation=${accommodationId}`)
        .then((data) =>
          setRooms(unwrapList(data).filter((r) => r.is_active !== false)),
        ),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar ofertas"))
      .finally(() => setLoading(false));
  }, [accommodationId, loadOffers]);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  const toggleRoom = (roomId: number) => {
    setForm((f) => {
      const has = f.room_ids.includes(roomId);
      return {
        ...f,
        room_ids: has ? f.room_ids.filter((id) => id !== roomId) : [...f.room_ids, roomId],
      };
    });
  };

  const selectAllRooms = () => {
    setForm((f) => ({ ...f, room_ids: rooms.map((r) => r.id) }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.room_ids.length === 0) {
      setFieldErrors({ room_ids: "Selecciona al menos una habitación." });
      return;
    }
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      await api.post(`/hospedajes/${accommodationId}/ofertas/`, {
        title: form.title.trim() || undefined,
        discount_percent: form.discount_percent,
        start_date: form.start_date,
        duration_days: Number(form.duration_days),
        room_ids: form.room_ids,
      });
      setForm(emptyForm());
      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(parseFieldErrors(err.data));
        setError(formatApiError(err));
      } else {
        setError(err instanceof Error ? err.message : "No se pudo crear la oferta");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offer: AccommodationOffer) => {
    setError("");
    try {
      await api.patch(`/hospedajes/${accommodationId}/ofertas/${offer.id}/`, {
        is_active: !offer.is_active,
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  };

  const remove = async (offer: AccommodationOffer) => {
    if (!window.confirm("¿Eliminar esta oferta?")) return;
    setError("");
    try {
      await api.delete(`/hospedajes/${accommodationId}/ofertas/${offer.id}/`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const roomLabel = (r: Room) =>
    `N.º ${r.number} · ${roomTypeLabel(r.type)} · ${r.capacity} pers.`;

  if (!canManage) {
    return (
      <section className="card section-sm">
        <h2>Ofertas y promociones</h2>
        <p className="muted">
          Cuando tu hospedaje esté aprobado podrás crear descuentos temporales en las
          habitaciones que elijas. Al terminar el plazo, esos cuartos vuelven a su precio
          habitual.
        </p>
      </section>
    );
  }

  return (
    <section className="card section-sm">
      <div className="section-head-row">
        <div>
          <h2>Ofertas y promociones</h2>
          <p className="muted">
            Elige qué habitaciones entran en la promoción, el descuento y cuántos días
            durará. Las que no selecciones mantienen su precio normal.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setFormOpen((v) => !v)}
          disabled={rooms.length === 0}
        >
          {formOpen ? "Cancelar" : "Nueva oferta"}
        </button>
      </div>

      {rooms.length === 0 && !loading && (
        <p className="muted">
          Crea al menos una habitación activa antes de publicar una oferta.
        </p>
      )}

      {error && <p className="error-msg">{error}</p>}

      {formOpen && rooms.length > 0 && (
        <form className="offer-form" onSubmit={submit}>
          <fieldset className="offer-rooms-fieldset">
            <legend>Habitaciones en oferta</legend>
            <div className="offer-rooms-toolbar">
              <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllRooms}>
                Seleccionar todas
              </button>
              <span className="muted">
                {form.room_ids.length} de {rooms.length} seleccionada
                {form.room_ids.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="offer-room-checklist">
              {rooms.map((r) => (
                <li key={r.id}>
                  <label className="offer-room-check">
                    <input
                      type="checkbox"
                      checked={form.room_ids.includes(r.id)}
                      onChange={() => toggleRoom(r.id)}
                    />
                    <span>{roomLabel(r)}</span>
                  </label>
                </li>
              ))}
            </ul>
            {fieldErrors.room_ids && (
              <span className="field-error">{fieldErrors.room_ids}</span>
            )}
          </fieldset>

          <label>
            Título (opcional)
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Verano en Lima"
            />
          </label>
          <label>
            Descuento (%)
            <input
              type="number"
              min={1}
              max={80}
              step="0.01"
              required
              value={form.discount_percent}
              onChange={(e) =>
                setForm((f) => ({ ...f, discount_percent: e.target.value }))
              }
            />
            {fieldErrors.discount_percent && (
              <span className="field-error">{fieldErrors.discount_percent}</span>
            )}
          </label>
          <label>
            Fecha de inicio
            <input
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
            {fieldErrors.start_date && (
              <span className="field-error">{fieldErrors.start_date}</span>
            )}
          </label>
          <label>
            Duración (días)
            <input
              type="number"
              min={1}
              max={365}
              required
              value={form.duration_days}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration_days: e.target.value }))
              }
            />
            {fieldErrors.duration_days && (
              <span className="field-error">{fieldErrors.duration_days}</span>
            )}
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Publicar oferta"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando ofertas…</p>
      ) : offers.length === 0 ? (
        <p className="muted">No tienes ofertas configuradas.</p>
      ) : (
        <ul className="offer-list">
          {offers.map((o) => (
            <li key={o.id} className={`offer-item${o.vigente ? " offer-item--active" : ""}`}>
              <div>
                <strong>
                  {o.title || `${o.discount_percent}% de descuento`}
                  {o.vigente && <span className="offer-badge">Vigente</span>}
                </strong>
                <p className="muted">
                  {o.start_date} → {o.end_date} ({o.duration_days} días)
                  {!o.is_active && " · Pausada"}
                  {o.vigente && o.dias_restantes > 0 && (
                    <> · Quedan {o.dias_restantes} día{o.dias_restantes === 1 ? "" : "s"}</>
                  )}
                </p>
                {o.rooms.length > 0 && (
                  <p className="offer-room-tags">
                    {o.rooms.map((r) => (
                      <span key={r.id} className="offer-room-tag">
                        N.º {r.number}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="offer-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleActive(o)}
                >
                  {o.is_active ? "Pausar" : "Reactivar"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(o)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
