import type { SponsorAd } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { resolveMediaUrl } from "../../utils/media";
import {
  adDisplayStatus,
  mockAdStats,
  truncateUrl,
} from "./sponsorAdUtils";

type Props = {
  ad: SponsorAd;
  onPause: (ad: SponsorAd) => void;
  onEdit: (ad: SponsorAd) => void;
  onDelete: (ad: SponsorAd) => void;
  busy?: boolean;
};

const MEDIA_LABEL: Record<string, string> = {
  image: "Imagen",
  gif: "GIF",
  video: "Video",
};

export function SponsorAdCard({ ad, onPause, onEdit, onDelete, busy }: Props) {
  const url = resolveMediaUrl(ad.media_url);
  const status = adDisplayStatus(ad);
  const stats = mockAdStats(ad.id);

  const badge =
    status === "published"
      ? { label: "Publicado", className: "sponsor-badge--ok" }
      : status === "paused"
        ? { label: "Pausado", className: "sponsor-badge--muted" }
        : status === "removed"
          ? { label: "Dado de baja", className: "sponsor-badge--err" }
          : { label: ad.status, className: "sponsor-badge--warn" };

  const canToggle = ad.status === "aprobado";

  return (
    <article className="sponsor-ad-card">
      <div className="sponsor-ad-card-thumb" aria-hidden={!url}>
        {url ? (
          ad.media_type === "video" ? (
            <video src={url} muted playsInline aria-label={`Miniatura: ${ad.title}`} />
          ) : (
            <img src={url} alt={`Creativo: ${ad.title}`} />
          )
        ) : (
          <span className="sponsor-ad-card-thumb-empty">
            <PrimeIcon name="pi-image" size={24} />
          </span>
        )}
        {ad.media_type === "video" && (
          <span className="sponsor-ad-card-type-icon" title="Video">
            <PrimeIcon name="pi-video" size={12} />
          </span>
        )}
      </div>

      <div className="sponsor-ad-card-body">
        <div className="sponsor-ad-card-head">
          <h4>{ad.title}</h4>
          <span className={`sponsor-badge ${badge.className}`}>{badge.label}</span>
        </div>

        <p className="sponsor-ad-card-meta">
          {MEDIA_LABEL[ad.media_type] ?? ad.media_type} · {ad.duration_seconds}s
          {status === "published" && " · Visible ahora"}
          {status === "paused" && " · No rota"}
        </p>

        {ad.link_url && (
          <p className="sponsor-ad-card-link">
            <PrimeIcon name="pi-external-link" size={12} />
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" title={ad.link_url}>
              {truncateUrl(ad.link_url)}
            </a>
          </p>
        )}

        {ad.takedown_reason && (
          <p className="sponsor-field-error">Motivo de baja: {ad.takedown_reason}</p>
        )}

        <div className="sponsor-ad-card-stats muted" aria-label="Estadísticas estimadas">
          <span title="Próximamente con datos reales">Impresiones (7d): {stats.impressions.toLocaleString("es-PE")}</span>
          <span>CTR: {stats.ctr}</span>
          <span className="sponsor-ad-card-stats-note">Estimado</span>
        </div>

        <div className="sponsor-ad-card-actions">
          {canToggle && (
            <button
              type="button"
              className="sponsor-btn sponsor-btn--outline sponsor-btn--icon"
              aria-label={ad.is_active ? "Pausar anuncio" : "Reanudar anuncio"}
              disabled={busy}
              onClick={() => onPause(ad)}
            >
              <PrimeIcon name={ad.is_active ? "pi-pause" : "pi-play"} size={16} />
              <span>{ad.is_active ? "Pausar" : "Reanudar"}</span>
            </button>
          )}
          {ad.status !== "baja" && (
            <button
              type="button"
              className="sponsor-btn sponsor-btn--outline-blue sponsor-btn--icon"
              aria-label="Editar anuncio"
              disabled={busy}
              onClick={() => onEdit(ad)}
            >
              <PrimeIcon name="pi-pencil" size={16} />
              <span>Editar</span>
            </button>
          )}
          <button
            type="button"
            className="sponsor-btn sponsor-btn--danger-outline sponsor-btn--icon"
            aria-label="Eliminar anuncio"
            disabled={busy}
            onClick={() => onDelete(ad)}
          >
            <PrimeIcon name="pi-trash" size={16} />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </article>
  );
}
