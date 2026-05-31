import { useEffect, useState, type FormEvent } from "react";
import type { BrowseTile } from "../../../api/types";
import { PrimeIcon } from "../../PrimeIcon";
import { FILTER_HINT, type HomeContentGroup } from "../../../utils/adminHomeContentData";
import { resolveMediaUrl } from "../../../utils/media";

export type TileFormState = {
  group: string;
  title: string;
  subtitle: string;
  slug: string;
  filter_value: string;
  gradient_css: string;
  order: string;
  is_active: boolean;
};

export const emptyTileForm = (group: string): TileFormState => ({
  group,
  title: "",
  subtitle: "",
  slug: "",
  filter_value: "",
  gradient_css: "linear-gradient(135deg, #0d6e6e 0%, #4db6ac 100%)",
  order: "0",
  is_active: true,
});

export const tileToForm = (tile: BrowseTile): TileFormState => ({
  group: tile.group,
  title: tile.title,
  subtitle: tile.subtitle ?? "",
  slug: tile.slug,
  filter_value: tile.filter_value,
  gradient_css: tile.gradient_css,
  order: String(tile.order ?? 0),
  is_active: tile.is_active !== false,
});

type Props = {
  open: boolean;
  mode: "create" | "edit";
  activeGroup: HomeContentGroup;
  form: TileFormState;
  setForm: React.Dispatch<React.SetStateAction<TileFormState>>;
  editing: BrowseTile | null;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imagePreviewUrl: string | null;
  fieldErrors: Record<string, string>;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
};

export function HomeContentEditorModal({
  open,
  mode,
  activeGroup,
  form,
  setForm,
  editing,
  imageFile,
  setImageFile,
  imagePreviewUrl,
  fieldErrors,
  error,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  if (!open) return null;

  const previewBg =
    localPreview ||
    imagePreviewUrl ||
    (editing?.image_url ? resolveMediaUrl(editing.image_url) : null);

  return (
    <div className="admin-home-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-home-modal"
        role="dialog"
        aria-labelledby="home-content-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-home-modal-header">
          <h2 id="home-content-editor-title">
            {mode === "create" ? "Agregar tarjeta" : `Editar «${editing?.title ?? ""}»`}
          </h2>
          <button
            type="button"
            className="messenger-header-icon messenger-header-icon--close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form className="admin-home-modal-body" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}

          <div className="admin-home-editor-layout">
            <div className="admin-home-editor-preview-col">
              <p className="admin-home-editor-preview-label">Vista previa</p>
              <article className="admin-home-tile-preview-card">
                <span
                  className="browse-tile-image browse-tile-image--v2 admin-home-tile-preview-img"
                  style={
                    previewBg
                      ? { backgroundImage: `url(${previewBg})` }
                      : { background: form.gradient_css }
                  }
                />
                <span className="browse-tile-label">{form.title || "Título"}</span>
                {form.subtitle && <span className="browse-tile-sub">{form.subtitle}</span>}
                <span className="admin-home-filter-badge">
                  {form.filter_value || "filtro"}
                </span>
              </article>
            </div>

            <div className="admin-home-editor-fields form-grid">
              <label className="full">
                Título
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>
              <label className="full">
                Descripción corta
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Texto bajo el título en la home"
                />
              </label>
              <label>
                Slug
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={
                    activeGroup === "departamento" ? "lima, cusco…" : "auto desde título"
                  }
                />
              </label>
              <label>
                Filtro técnico
                <input
                  value={form.filter_value}
                  onChange={(e) => setForm({ ...form, filter_value: e.target.value })}
                  placeholder={FILTER_HINT[activeGroup]}
                  required
                />
                {fieldErrors.filter_value && (
                  <span className="field-error">{fieldErrors.filter_value}</span>
                )}
              </label>
              <label className="full">
                Imagen
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <span className="muted admin-home-field-hint">
                  JPG o PNG. Si no subes imagen, se usa el degradado.
                </span>
              </label>
              <label className="full">
                Degradado CSS (respaldo)
                <input
                  value={form.gradient_css}
                  onChange={(e) => setForm({ ...form, gradient_css: e.target.value })}
                />
              </label>
              <label className="admin-home-toggle-row">
                <span>Visible en la página de inicio</span>
                <input
                  type="checkbox"
                  className="admin-home-toggle"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              </label>
            </div>
          </div>

          <footer className="admin-home-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <PrimeIcon name="pi-check" size={14} />
              {saving ? "Guardando…" : mode === "create" ? "Crear tarjeta" : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
