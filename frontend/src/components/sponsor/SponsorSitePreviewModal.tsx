import { useEffect, useMemo, useState } from "react";
import type { SponsorAd } from "../../api/types";
import { resolveMediaUrl } from "../../utils/media";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  open: boolean;
  ads: SponsorAd[];
  previewUrl?: string | null;
  previewMediaType?: SponsorAd["media_type"] | null;
  previewTitle?: string;
  previewDuration?: number;
  onClose: () => void;
};

type PreviewItem = {
  id: number;
  title: string;
  media_url: string;
  media_type: SponsorAd["media_type"];
  duration_seconds: number;
  link_url?: string;
};

export function SponsorSitePreviewModal({
  open,
  ads,
  previewUrl,
  previewMediaType,
  previewTitle = "Vista previa",
  previewDuration = 5,
  onClose,
}: Props) {
  const liveAds = useMemo(
    () => ads.filter((a) => a.status === "aprobado" && a.is_active && a.media_url),
    [ads],
  );

  const items: PreviewItem[] = useMemo(() => {
    if (previewUrl) {
      return [
        {
          id: -1,
          title: previewTitle,
          media_url: previewUrl,
          media_type: previewMediaType ?? "image",
          duration_seconds: previewDuration,
        },
      ];
    }
    return liveAds.map((a) => ({
      id: a.id,
      title: a.title,
      media_url: resolveMediaUrl(a.media_url) ?? a.media_url ?? "",
      media_type: a.media_type,
      duration_seconds: a.duration_seconds,
      link_url: a.link_url,
    }));
  }, [previewUrl, previewTitle, previewMediaType, previewDuration, liveAds]);

  const [index, setIndex] = useState(0);
  const current = items.length > 0 ? items[index % items.length] : null;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, items.length]);

  useEffect(() => {
    if (!open || items.length <= 1 || !current) return;
    const sec = Math.min(Math.max(current.duration_seconds, 1), 10);
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), sec * 1000);
    return () => window.clearTimeout(t);
  }, [open, items.length, index, current?.id, current?.duration_seconds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mediaSrc = current?.media_url ?? "";

  return (
    <div
      className="sponsor-modal-overlay sponsor-site-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa en el sitio"
      onClick={onClose}
    >
      <div className="sponsor-site-preview" onClick={(e) => e.stopPropagation()}>
        <header className="sponsor-site-preview-head">
          <div>
            <h3>Así se ve en Hospy</h3>
            <p className="muted">
              Simulación del inicio con rotación real ({items.length} anuncio
              {items.length === 1 ? "" : "s"}).
            </p>
          </div>
          <button type="button" className="sponsor-icon-btn" aria-label="Cerrar" onClick={onClose}>
            <PrimeIcon name="pi-times" size={20} />
          </button>
        </header>

        <div className="sponsor-site-preview-frame">
          <div className="sponsor-site-preview-chrome">
            <span className="sponsor-site-preview-logo">Hospy</span>
            <span className="sponsor-site-preview-nav muted">Explorar · Destinos · Ofertas</span>
          </div>

          <div className="sponsor-site-preview-hero muted">Encuentra tu próxima estancia</div>

          <div className="sponsor-site-preview-body">
            <aside className="sponsor-site-preview-side" aria-label="Anuncio lateral">
              {current ? (
                <>
                  <span className="sponsor-mock-tag">Patrocinado</span>
                  {current.media_type === "video" ? (
                    <video
                      key={current.id}
                      src={mediaSrc}
                      muted
                      playsInline
                      autoPlay
                      loop={items.length <= 1}
                    />
                  ) : (
                    <img key={current.id} src={mediaSrc} alt={current.title} />
                  )}
                  <span className="sponsor-mock-title">{current.title}</span>
                </>
              ) : (
                <p className="muted">Sin anuncios activos para mostrar.</p>
              )}
            </aside>

            <main className="sponsor-site-preview-main muted">
              Contenido del inicio (alojamientos, categorías…)
            </main>

            <aside className="sponsor-site-preview-side" aria-hidden />
          </div>

          <div className="sponsor-site-preview-mobile-banner" aria-label="Banner móvil">
            {current && (
              <>
                {current.media_type === "video" ? (
                  <video
                    key={`m-${current.id}`}
                    src={mediaSrc}
                    muted
                    playsInline
                    autoPlay
                    loop={items.length <= 1}
                  />
                ) : (
                  <img key={`m-${current.id}`} src={mediaSrc} alt="" />
                )}
              </>
            )}
          </div>
        </div>

        {items.length > 1 && (
          <p className="sponsor-hint sponsor-site-preview-rotate">
            Rotando cada {current?.duration_seconds ?? 5}s · anuncio {index + 1} de {items.length}
          </p>
        )}
      </div>
    </div>
  );
}
