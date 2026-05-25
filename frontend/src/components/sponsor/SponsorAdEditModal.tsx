import { useEffect, useState } from "react";
import { ApiError, api } from "../../api/client";
import type { SponsorAd } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { SponsorAdDropzone } from "./SponsorAdDropzone";
import { showSponsorToast } from "./SponsorToast";
import { clampDuration, isValidUrl, validateCreativeFile } from "./sponsorAdUtils";

type Props = {
  ad: SponsorAd | null;
  maxDur: number;
  onClose: () => void;
  onSaved: () => void;
};

export function SponsorAdEditModal({ ad, maxDur, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [duration, setDuration] = useState(5);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ad) return;
    setTitle(ad.title);
    setLinkUrl(ad.link_url || "");
    setDuration(clampDuration(ad.duration_seconds, maxDur));
    setFile(null);
    setPreviewUrl(null);
    setError("");
  }, [ad, maxDur]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  if (!ad) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!isValidUrl(linkUrl)) {
      setError("Introduce una URL válida (https://…).");
      return;
    }
    if (file) {
      const fe = validateCreativeFile(file);
      if (fe) {
        setError(fe);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      if (file) {
        const body = new FormData();
        body.append("title", title.trim());
        body.append("link_url", linkUrl.trim());
        body.append("duration_seconds", String(clampDuration(duration, maxDur)));
        body.append("media", file);
        await api.patch<SponsorAd>(`/mis-anuncios/${ad.id}/`, body);
      } else {
        await api.patch<SponsorAd>(`/mis-anuncios/${ad.id}/`, {
          title: title.trim(),
          link_url: linkUrl.trim(),
          duration_seconds: clampDuration(duration, maxDur),
        });
      }
      showSponsorToast("Anuncio actualizado correctamente.", "success");
      window.dispatchEvent(new Event("hospy:sponsor-ads-refresh"));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="sponsor-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-edit-title"
      onClick={onClose}
    >
      <div className="sponsor-modal sponsor-modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="sponsor-modal-header">
          <h3 id="sponsor-edit-title">
            <PrimeIcon name="pi-pencil" size={18} /> Editar anuncio
          </h3>
          <button type="button" className="sponsor-icon-btn" aria-label="Cerrar" onClick={onClose}>
            <PrimeIcon name="pi-times" size={18} />
          </button>
        </header>

        <form className="sponsor-form" onSubmit={submit}>
          <label className="sponsor-field">
            <span className="sponsor-label">Título</span>
            <input
              className="sponsor-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="sponsor-field">
            <span className="sponsor-label">
              Segundos en rotación (1–{maxDur})
            </span>
            <div className="sponsor-duration-row">
              <input
                type="range"
                min={1}
                max={maxDur}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                aria-valuetext={`${duration} segundos`}
              />
              <input
                type="number"
                className="sponsor-input sponsor-input--narrow"
                min={1}
                max={maxDur}
                value={duration}
                onChange={(e) =>
                  setDuration(clampDuration(Number(e.target.value) || 1, maxDur))
                }
              />
            </div>
          </label>

          <label className="sponsor-field">
            <span className="sponsor-label">Enlace (opcional)</span>
            <input
              className="sponsor-input"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://tusitio.com/oferta"
            />
          </label>

          <SponsorAdDropzone
            file={file}
            previewUrl={previewUrl}
            onFileChange={setFile}
            disabled={saving}
          />
          <p className="sponsor-hint">Deja el archivo vacío si solo quieres cambiar texto o duración.</p>

          {error && <p className="sponsor-field-error">{error}</p>}

          <div className="sponsor-modal-actions">
            <button type="button" className="sponsor-btn sponsor-btn--outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="sponsor-btn sponsor-btn--primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
