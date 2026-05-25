import { useState } from "react";
import type { AccommodationPhoto } from "../api/types";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { resolveMediaUrl } from "../utils/media";

interface Props {
  fotos: AccommodationPhoto[];
  name: string;
}

export function PhotoGallery({ fotos, name }: Props) {
  const { t, tVars } = useLocaleCurrency();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const sorted = [...fotos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.order - b.order;
  });
  const urls = sorted
    .map((f) => resolveMediaUrl(f.image_url ?? f.image))
    .filter(Boolean) as string[];

  if (urls.length === 0) {
    return (
      <div className="property-gallery property-gallery--empty">
        <span>{t("detail.galleryNoPhotos")}</span>
      </div>
    );
  }

  const main = urls[0];
  const side = urls.slice(1, 3);
  const thumbs = urls.slice(3, 8);
  const extra = urls.length - 8;

  return (
    <>
      <div className="property-gallery">
        <button
          type="button"
          className="gallery-main"
          style={{ backgroundImage: `url(${main})` }}
          onClick={() => setLightbox(0)}
          aria-label={tVars("detail.mainPhotoAria", { name })}
        />
        <div className="gallery-side">
          {side.map((url, i) => (
            <button
              key={url}
              type="button"
              className="gallery-side-item"
              style={{ backgroundImage: `url(${url})` }}
              onClick={() => setLightbox(i + 1)}
              aria-label={tVars("detail.photoN", { n: i + 2 })}
            />
          ))}
          {side.length < 2 &&
            Array.from({ length: 2 - side.length }).map((_, i) => (
              <div key={`ph-${i}`} className="gallery-side-item gallery-placeholder" />
            ))}
        </div>
        {thumbs.length > 0 && (
          <div className="gallery-thumbs">
            {thumbs.map((url, i) => (
              <button
                key={url}
                type="button"
                className="gallery-thumb"
                style={{ backgroundImage: `url(${url})` }}
                onClick={() => setLightbox(i + 3)}
              >
                {i === thumbs.length - 1 && extra > 0 && (
                  <span className="gallery-more">{tVars("detail.morePhotos", { n: extra })}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal
          onClick={() => setLightbox(null)}
        >
          <button type="button" className="lightbox-close" onClick={() => setLightbox(null)}>
            ×
          </button>
          <img src={urls[lightbox]} alt={name} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-nav">
            <button
              type="button"
              disabled={lightbox === 0}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((lightbox - 1 + urls.length) % urls.length);
              }}
            >
              ‹
            </button>
            <span>
              {lightbox + 1} / {urls.length}
            </span>
            <button
              type="button"
              disabled={lightbox === urls.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((lightbox + 1) % urls.length);
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
