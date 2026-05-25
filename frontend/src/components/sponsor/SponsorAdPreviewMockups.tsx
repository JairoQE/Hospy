import type { SponsorAdMediaType } from "../../api/types";

type Props = {
  previewUrl: string | null;
  mediaType: SponsorAdMediaType | null;
  title: string;
  durationSeconds: number;
};

function Creative({
  previewUrl,
  mediaType,
  title,
  className,
}: {
  previewUrl: string | null;
  mediaType: SponsorAdMediaType | null;
  title: string;
  className: string;
}) {
  if (!previewUrl) {
    return (
      <div className={`${className} sponsor-mock-placeholder`}>
        <span>Tu anuncio aquí</span>
      </div>
    );
  }
  if (mediaType === "video") {
    return (
      <video
        className={className}
        src={previewUrl}
        muted
        playsInline
        autoPlay
        loop
        aria-label={title || "Vista previa de video"}
      />
    );
  }
  return <img className={className} src={previewUrl} alt={title || "Vista previa del anuncio"} />;
}

export function SponsorAdPreviewMockups({ previewUrl, mediaType, title, durationSeconds }: Props) {
  return (
    <aside className="sponsor-preview-panel" aria-label="Vista previa del anuncio">
      <div className="sponsor-preview-panel-head">
        <h3>Vista previa en vivo</h3>
        <span className="sponsor-preview-timer" title="Duración en rotación">
          {durationSeconds}s
        </span>
      </div>
      <p className="sponsor-hint sponsor-preview-note">
        Así se verá tu creativo en Hospy. Los videos se muestran sin sonido.
      </p>

      <div className="sponsor-mock-group">
        <p className="sponsor-mock-label">
          <span className="sponsor-mock-device">Escritorio</span> · barra lateral 300×250
        </p>
        <div className="sponsor-mock sponsor-mock--desktop" data-size="300×250">
          <span className="sponsor-mock-tag">Patrocinado</span>
          <Creative
            previewUrl={previewUrl}
            mediaType={mediaType}
            title={title}
            className="sponsor-mock-media"
          />
          {title && <span className="sponsor-mock-title">{title}</span>}
        </div>
      </div>

      <div className="sponsor-mock-group">
        <p className="sponsor-mock-label">
          <span className="sponsor-mock-device">Móvil</span> · banner 320×100
        </p>
        <div className="sponsor-mock sponsor-mock--mobile" data-size="320×100">
          <span className="sponsor-mock-tag">Patrocinado</span>
          <Creative
            previewUrl={previewUrl}
            mediaType={mediaType}
            title={title}
            className="sponsor-mock-media sponsor-mock-media--banner"
          />
        </div>
      </div>
    </aside>
  );
}
