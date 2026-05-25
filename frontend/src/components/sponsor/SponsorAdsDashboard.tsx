import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../../api/client";
import { unwrapList } from "../../api/unwrap";
import type { Paginated, SponsorAd } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { SponsorAdCard } from "./SponsorAdCard";
import { SponsorAdDropzone } from "./SponsorAdDropzone";
import { SponsorAdEditModal } from "./SponsorAdEditModal";
import { SponsorAdPreviewMockups } from "./SponsorAdPreviewMockups";
import { SponsorConfirmModal } from "./SponsorConfirmModal";
import { SponsorSitePreviewModal } from "./SponsorSitePreviewModal";
import { showSponsorToast, SponsorToastHost } from "./SponsorToast";
import {
  clampDuration,
  detectFileMediaType,
  isValidUrl,
  MAX_ACTIVE_ADS,
  validateCreativeFile,
} from "./sponsorAdUtils";
import "../../styles/sponsor-dashboard.css";

type Props = {
  maxDur: number;
  onRefreshUser?: () => Promise<void>;
};

export function SponsorAdsDashboard({ maxDur, onRefreshUser }: Props) {
  const [ads, setAds] = useState<SponsorAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [form, setForm] = useState({ title: "", link_url: "", duration_seconds: 5 });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");

  const [editAd, setEditAd] = useState<SponsorAd | null>(null);
  const [deleteAd, setDeleteAd] = useState<SponsorAd | null>(null);
  const [sitePreviewOpen, setSitePreviewOpen] = useState(false);

  const liveCount = useMemo(
    () => ads.filter((a) => a.status === "aprobado" && a.is_active).length,
    [ads],
  );

  const previewMediaType = file ? detectFileMediaType(file) : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SponsorAd[] | Paginated<SponsorAd>>("/mis-anuncios/");
      setAds(unwrapList(data));
    } catch (e) {
      showSponsorToast(
        e instanceof Error ? e.message : "Error al cargar tus anuncios",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const simulateProgress = () => {
    setUploadProgress(8);
    const steps = [22, 45, 68, 88, 100];
    let i = 0;
    const id = window.setInterval(() => {
      if (i < steps.length) {
        setUploadProgress(steps[i]);
        i += 1;
      } else {
        window.clearInterval(id);
      }
    }, 180);
    return () => window.clearInterval(id);
  };

  const submitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFileError("");

    if (!form.title.trim()) {
      setFormError("El título del anuncio es obligatorio.");
      return;
    }
    if (!file) {
      setFileError("Selecciona una imagen, GIF o video.");
      return;
    }
    const fe = validateCreativeFile(file);
    if (fe) {
      setFileError(fe);
      return;
    }
    if (!isValidUrl(form.link_url)) {
      setFormError("Introduce una URL válida (https://…).");
      return;
    }
    if (!acceptedTerms) {
      setFormError("Debes aceptar las políticas de contenido de Hospy.");
      return;
    }
    if (liveCount >= MAX_ACTIVE_ADS) {
      setFormError(
        `Ya tienes ${MAX_ACTIVE_ADS} anuncios activos. Pausa o elimina uno antes de publicar otro.`,
      );
      return;
    }

    setUploading(true);
    const stopProgress = simulateProgress();
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("link_url", form.link_url.trim());
      body.append("duration_seconds", String(clampDuration(form.duration_seconds, maxDur)));
      body.append("media", file);
      await api.post<SponsorAd>("/mis-anuncios/", body);
      showSponsorToast("✅ Anuncio publicado. Ya aparece en la rotación del sitio (10–15 s).");
      setForm({ title: "", link_url: "", duration_seconds: 5 });
      setFile(null);
      setAcceptedTerms(false);
      window.dispatchEvent(new Event("hospy:sponsor-ads-refresh"));
      await load();
      await onRefreshUser?.();
    } catch (err) {
      showSponsorToast(
        err instanceof ApiError ? err.message : "No se pudo publicar el anuncio",
        "error",
      );
    } finally {
      stopProgress();
      setUploadProgress(null);
      setUploading(false);
    }
  };

  const toggleActive = async (ad: SponsorAd) => {
    if (ad.status !== "aprobado") return;
    setBusyId(ad.id);
    try {
      await api.patch(`/mis-anuncios/${ad.id}/`, { is_active: !ad.is_active });
      showSponsorToast(
        ad.is_active ? "Anuncio pausado. Ya no rota en el sitio." : "Anuncio reanudado. Vuelve a la rotación.",
        "info",
      );
      await load();
      window.dispatchEvent(new Event("hospy:sponsor-ads-refresh"));
    } catch (e) {
      showSponsorToast(e instanceof ApiError ? e.message : "Error al cambiar estado", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteAd) return;
    setBusyId(deleteAd.id);
    try {
      await api.delete(`/mis-anuncios/${deleteAd.id}/`);
      showSponsorToast("Anuncio eliminado. Dejó de mostrarse en el sitio.", "info");
      setDeleteAd(null);
      await load();
      window.dispatchEvent(new Event("hospy:sponsor-ads-refresh"));
    } catch (e) {
      showSponsorToast(e instanceof ApiError ? e.message : "Error al eliminar", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="sponsor-dashboard">
      <SponsorToastHost />

      <header className="sponsor-dashboard-header">
        <div>
          <p className="sponsor-dashboard-kicker">Panel de patrocinador</p>
          <h1 className="sponsor-dashboard-title">Mis anuncios</h1>
          <p className="sponsor-dashboard-sub">
            Los anuncios rotan en la página de inicio de Hospy. En escritorio se ven en la barra
            lateral; en móvil como banner superior. Máximo {maxDur} segundos por anuncio.
          </p>
        </div>
        <div className="sponsor-dashboard-header-actions">
          <div className="sponsor-dashboard-stats">
            <div className="sponsor-dashboard-stat">
              <strong>{liveCount}</strong>
              <span>En rotación</span>
            </div>
            <div className="sponsor-dashboard-stat">
              <strong>{ads.length}</strong>
              <span>Total</span>
            </div>
          </div>
          <button
            type="button"
            className="sponsor-btn sponsor-btn--outline-blue"
            onClick={() => setSitePreviewOpen(true)}
          >
            <PrimeIcon name="pi-eye" size={16} /> Ver cómo se ve en el sitio
          </button>
        </div>
      </header>

      <div className="sponsor-rotation-tip" role="note">
        <PrimeIcon name="pi-info-circle" size={18} />
        <p>
          Los anuncios se muestran en orden circular. Si hay varios activos, la rotación respeta la
          duración de cada uno (1–{maxDur}s). La publicación es instantánea: entra en rotación en
          unos 10–15 segundos, sin aprobación previa por anuncio.
        </p>
      </div>

      <section className="sponsor-publish-section" aria-labelledby="sponsor-publish-heading">
        <h2 id="sponsor-publish-heading" className="sr-only">
          Publicar nuevo anuncio
        </h2>
        <div className="sponsor-publish-layout">
          <div className="sponsor-publish-form-card">
            <h3 className="sponsor-card-title">
              <PrimeIcon name="pi-plus-circle" size={20} /> Nuevo anuncio
            </h3>

            <form className="sponsor-form" onSubmit={submitAd} noValidate>
              <label className="sponsor-field">
                <span className="sponsor-label">
                  Título del anuncio <span className="sponsor-required">*</span>
                </span>
                <input
                  className="sponsor-input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej. QuizCat — aprendo jugando"
                  required
                  aria-describedby="title-hint"
                />
                <span id="title-hint" className="sponsor-hint">
                  Nombre interno para identificar tu anuncio
                </span>
              </label>

              <label className="sponsor-field">
                <span className="sponsor-label">
                  Segundos en rotación (1–{maxDur})
                  <span
                    className="sponsor-tooltip"
                    title="Tiempo que se mostrará antes de rotar al siguiente anuncio"
                  >
                    ?
                  </span>
                </span>
                <div className="sponsor-duration-row">
                  <input
                    type="range"
                    min={1}
                    max={maxDur}
                    value={form.duration_seconds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        duration_seconds: clampDuration(Number(e.target.value), maxDur),
                      }))
                    }
                    aria-valuetext={`${form.duration_seconds} segundos`}
                  />
                  <input
                    type="number"
                    className="sponsor-input sponsor-input--narrow"
                    min={1}
                    max={maxDur}
                    value={form.duration_seconds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        duration_seconds: clampDuration(Number(e.target.value) || 1, maxDur),
                      }))
                    }
                  />
                </div>
              </label>

              <label className="sponsor-field">
                <span className="sponsor-label">Enlace al hacer clic (opcional)</span>
                <input
                  className="sponsor-input"
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://tusitio.com/oferta"
                />
              </label>

              <SponsorAdDropzone
                file={file}
                previewUrl={previewUrl}
                onFileChange={(f) => {
                  setFile(f);
                  setFileError("");
                }}
                disabled={uploading}
                error={fileError}
                uploadProgress={uploadProgress}
              />

              <label className="sponsor-terms">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>Acepto que el contenido no viola las políticas de Hospy</span>
              </label>

              {formError && <p className="sponsor-field-error" role="alert">{formError}</p>}

              {liveCount >= MAX_ACTIVE_ADS && (
                <p className="sponsor-field-warn" role="status">
                  Tienes el máximo de {MAX_ACTIVE_ADS} anuncios activos. Pausa uno para publicar otro.
                </p>
              )}

              <button
                type="submit"
                className="sponsor-btn sponsor-btn--primary sponsor-btn--block"
                disabled={uploading || liveCount >= MAX_ACTIVE_ADS}
                title="Publicación instantánea en la rotación del sitio"
              >
                {uploading ? "Publicando…" : "Publicar anuncio"}
              </button>
            </form>
          </div>

          <SponsorAdPreviewMockups
            previewUrl={previewUrl}
            mediaType={previewMediaType}
            title={form.title}
            durationSeconds={form.duration_seconds}
          />
        </div>
      </section>

      <section className="sponsor-list-section" aria-labelledby="sponsor-list-heading">
        <h2 id="sponsor-list-heading" className="sponsor-card-title">
          <PrimeIcon name="pi-images" size={20} /> Tus anuncios
        </h2>

        {loading && <p className="sponsor-loading muted">Cargando anuncios…</p>}

        {!loading && ads.length === 0 && (
          <div className="sponsor-empty-state">
            <PrimeIcon name="pi-inbox" size={40} />
            <p>Aún no tienes anuncios. Publica el primero arriba y aparecerá en el inicio de Hospy.</p>
          </div>
        )}

        {!loading && ads.length > 0 && (
          <div className="sponsor-ad-grid">
            {ads.map((ad) => (
              <SponsorAdCard
                key={ad.id}
                ad={ad}
                onPause={toggleActive}
                onEdit={setEditAd}
                onDelete={setDeleteAd}
                busy={busyId === ad.id}
              />
            ))}
          </div>
        )}
      </section>

      <SponsorAdEditModal
        ad={editAd}
        maxDur={maxDur}
        onClose={() => setEditAd(null)}
        onSaved={() => void load()}
      />

      <SponsorConfirmModal
        open={!!deleteAd}
        title="Eliminar anuncio"
        message={
          deleteAd
            ? `¿Eliminar «${deleteAd.title}»? Esta acción es irreversible y el anuncio dejará de mostrarse inmediatamente.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        onCancel={() => setDeleteAd(null)}
        onConfirm={() => void confirmDelete()}
      />

      <SponsorSitePreviewModal
        open={sitePreviewOpen}
        ads={ads}
        previewUrl={previewUrl}
        previewMediaType={previewMediaType ?? undefined}
        previewTitle={form.title || "Vista previa"}
        previewDuration={form.duration_seconds}
        onClose={() => setSitePreviewOpen(false)}
      />
    </div>
  );
}
