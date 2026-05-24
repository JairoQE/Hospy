import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { formatApiError, parseFieldErrors } from "../api/errors";
import type { BrowseTile } from "../api/types";
import { PrimeIcon } from "../components/PrimeIcon";
import { resolveMediaUrl } from "../utils/media";

const GROUPS = [
  { value: "tipo", label: "Tipos de alojamiento" },
  { value: "region", label: "Regiones naturales" },
  { value: "departamento", label: "Departamentos" },
] as const;

const FILTER_HINT: Record<string, string> = {
  tipo: "hotel, hostal, hospedaje",
  region: "costa, sierra, selva",
  departamento: "Lima, Cusco, Arequipa…",
};

type TileFormState = {
  group: string;
  title: string;
  subtitle: string;
  slug: string;
  filter_value: string;
  gradient_css: string;
  order: string;
  is_active: boolean;
};

const emptyForm = (group: string): TileFormState => ({
  group,
  title: "",
  subtitle: "",
  slug: "",
  filter_value: "",
  gradient_css: "linear-gradient(135deg, #0d6e6e 0%, #4db6ac 100%)",
  order: "0",
  is_active: true,
});

const tileToForm = (tile: BrowseTile): TileFormState => ({
  group: tile.group,
  title: tile.title,
  subtitle: tile.subtitle ?? "",
  slug: tile.slug,
  filter_value: tile.filter_value,
  gradient_css: tile.gradient_css,
  order: String(tile.order ?? 0),
  is_active: tile.is_active !== false,
});

type ExpandedPanel = { kind: "create" } | { kind: "edit"; tileId: number };

interface TileFormFieldsProps {
  activeGroup: string;
  form: TileFormState;
  setForm: React.Dispatch<React.SetStateAction<TileFormState>>;
  editing: BrowseTile | null;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  fieldErrors: Record<string, string>;
}

function TileFormFields({
  activeGroup,
  form,
  setForm,
  editing,
  imageFile,
  setImageFile,
  fieldErrors,
}: TileFormFieldsProps) {
  return (
    <div className="form-grid">
      <label className="full">
        Título
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </label>
      <label className="full">
        Subtítulo (opcional)
        <input
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
      </label>
      <label>
        Slug (URL interna)
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder={
            activeGroup === "departamento" ? "lima, cusco, la-libertad…" : "auto desde título"
          }
        />
        {activeGroup === "departamento" && (
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Si coincide con el árbol (lima, cusco…), al pulsar se abren provincias y distritos.
          </span>
        )}
      </label>
      <label>
        Valor de filtro
        <input
          value={form.filter_value}
          onChange={(e) => setForm({ ...form, filter_value: e.target.value })}
          placeholder={FILTER_HINT[activeGroup] ?? ""}
          required
        />
        {fieldErrors.filter_value && (
          <span className="field-error">{fieldErrors.filter_value}</span>
        )}
      </label>
      <label>
        Orden
        <input
          type="number"
          min={0}
          value={form.order}
          onChange={(e) => setForm({ ...form, order: e.target.value })}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
        />
        Visible en el inicio
      </label>
      <label className="full">
        Degradado CSS (si no hay imagen)
        <input
          value={form.gradient_css}
          onChange={(e) => setForm({ ...form, gradient_css: e.target.value })}
        />
      </label>
      <label className="full">
        Imagen
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        {editing?.image_url && !imageFile && (
          <img
            className="browse-admin-preview"
            src={resolveMediaUrl(editing.image_url)}
            alt=""
          />
        )}
      </label>
    </div>
  );
}

export function AdminHomeContentPage() {
  const [activeGroup, setActiveGroup] = useState<string>("tipo");
  const [tiles, setTiles] = useState<BrowseTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedPanel | null>(null);
  const [editing, setEditing] = useState<BrowseTile | null>(null);
  const [form, setForm] = useState<TileFormState>(emptyForm("tipo"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<BrowseTile[]>(`/inicio-bloques/?group=${activeGroup}`)
      .then((data) => setTiles(Array.isArray(data) ? data : []))
      .catch(() => setTiles([]))
      .finally(() => setLoading(false));
  }, [activeGroup]);

  useEffect(() => {
    load();
  }, [load]);

  const closePanel = () => {
    setExpanded(null);
    setEditing(null);
    setImageFile(null);
    setError("");
    setFieldErrors({});
  };

  const openCreate = () => {
    if (expanded?.kind === "create") {
      closePanel();
      return;
    }
    setEditing(null);
    setForm(emptyForm(activeGroup));
    setImageFile(null);
    setFieldErrors({});
    setError("");
    setExpanded({ kind: "create" });
  };

  const toggleEdit = (tile: BrowseTile) => {
    if (expanded?.kind === "edit" && expanded.tileId === tile.id) {
      closePanel();
      return;
    }
    setEditing(tile);
    setForm(tileToForm(tile));
    setImageFile(null);
    setFieldErrors({});
    setError("");
    setExpanded({ kind: "edit", tileId: tile.id });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    const payload = {
      group: activeGroup,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      slug: form.slug.trim() || form.title.trim().toLowerCase(),
      filter_value: form.filter_value.trim().toLowerCase(),
      gradient_css: form.gradient_css,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };

    try {
      if (imageFile) {
        const body = new FormData();
        Object.entries(payload).forEach(([k, v]) => body.append(k, String(v)));
        body.append("is_active", payload.is_active ? "true" : "false");
        body.append("image", imageFile);
        if (editing) {
          await api.patch(`/inicio-bloques/${editing.id}/`, body);
        } else {
          await api.post("/inicio-bloques/", body);
        }
      } else if (editing) {
        await api.patch(`/inicio-bloques/${editing.id}/`, payload);
      } else {
        await api.post("/inicio-bloques/", payload);
      }
      closePanel();
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tile: BrowseTile) => {
    if (!confirm(`¿Eliminar «${tile.title}»?`)) return;
    try {
      await api.delete(`/inicio-bloques/${tile.id}/`);
      if (expanded?.kind === "edit" && expanded.tileId === tile.id) {
        closePanel();
      }
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  const isCreateOpen = expanded?.kind === "create";

  return (
    <div className="admin-page">
      <Link to="/admin" className="back-link admin-link-btn">
        <PrimeIcon name="pi-arrow-left" size={14} /> Volver al dashboard
      </Link>
      <h1>Contenido del inicio</h1>
      <p className="muted">
        Tarjetas de tipos y regiones en la página principal. Sube imágenes o usa un degradado de
        respaldo.
      </p>

      <div className="admin-tabs">
        {GROUPS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={`btn btn-ghost${activeGroup === g.value ? " is-active" : ""}`}
            onClick={() => {
              setActiveGroup(g.value);
              closePanel();
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={`btn btn-primary${isCreateOpen ? " is-active" : ""}`}
          onClick={openCreate}
          aria-expanded={isCreateOpen}
        >
          {isCreateOpen ? "Cerrar formulario" : "Añadir bloque"}
        </button>
      </div>

      {isCreateOpen && (
        <form className="card section-sm browse-admin-form" onSubmit={save}>
          <h2>Nuevo bloque</h2>
          {error && <p className="error-msg">{error}</p>}
          <TileFormFields
            activeGroup={activeGroup}
            form={form}
            setForm={setForm}
            editing={editing}
            imageFile={imageFile}
            setImageFile={setImageFile}
            fieldErrors={fieldErrors}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={closePanel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="muted">Cargando…</p>}
      {!loading && tiles.length === 0 && (
        <p className="muted">No hay bloques. Crea el primero.</p>
      )}

      <ul className="browse-admin-list">
        {tiles.map((tile) => {
          const img = resolveMediaUrl(tile.image_url);
          const isOpen = expanded?.kind === "edit" && expanded.tileId === tile.id;
          return (
            <li
              key={tile.id}
              className={`card browse-admin-item${isOpen ? " is-expanded" : ""}`}
            >
              <div className="browse-admin-item-row">
                <div
                  className="browse-admin-thumb"
                  style={
                    img
                      ? { backgroundImage: `url(${img})` }
                      : { background: tile.gradient_css }
                  }
                />
                <div className="browse-admin-meta">
                  <strong>{tile.title}</strong>
                  {tile.subtitle && <p className="muted">{tile.subtitle}</p>}
                  <p className="muted">
                    Filtro: <code>{tile.filter_value}</code> · Orden {tile.order}
                    {!tile.is_active && " · Oculto"}
                  </p>
                  <div className="btn-row">
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm${isOpen ? " is-active" : ""}`}
                      onClick={() => toggleEdit(tile)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "Cerrar" : "Editar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm room-delete-btn"
                      onClick={() => remove(tile)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              {isOpen && (
                <form
                  className="browse-admin-collapse"
                  onSubmit={save}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="browse-admin-collapse-title">Editar bloque</h3>
                  {error && <p className="error-msg">{error}</p>}
                  <TileFormFields
                    activeGroup={activeGroup}
                    form={form}
                    setForm={setForm}
                    editing={editing}
                    imageFile={imageFile}
                    setImageFile={setImageFile}
                    fieldErrors={fieldErrors}
                  />
                  <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={closePanel}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
