import { useState } from "react";
import type { AccommodationPhoto } from "../api/types";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { resolveMediaUrl } from "../utils/media";
import { PrimeIcon } from "./PrimeIcon";

interface Props {
  fotos: AccommodationPhoto[];
  name: string;
}

type GalleryTile = {
  url: string;
  index: number;
  label: string;
};

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
      <div className="property-gallery property-gallery--empty" role="img" aria-label={t("detail.galleryNoPhotos")}>
        <PrimeIcon name="pi-image" size={40} className="property-gallery-empty-icon" />
        <span>{t("detail.galleryNoPhotos")}</span>
      </div>
    );
  }

  const count = urls.length;
  const layoutClass =
    count === 1
      ? "property-gallery--one"
      : count === 2
        ? "property-gallery--two"
        : count === 3
          ? "property-gallery--three"
          : count === 4
            ? "property-gallery--four"
            : "property-gallery--many";

  const tiles: GalleryTile[] = urls.map((url, index) => ({
    url,
    index,
    label:
      index === 0
        ? tVars("detail.mainPhotoAria", { name })
        : tVars("detail.photoN", { n: index + 1 }),
  }));

  /** En mosaico grande: principal + laterales; el resto va en franja inferior. */
  const mainTile = tiles[0];
  const sideTiles = count >= 5 ? tiles.slice(1, 3) : [];
  const thumbTiles = count >= 5 ? tiles.slice(3, 8) : [];
  const extra = count > 8 ? count - 8 : 0;

  /** 2–4 fotos: todas en el mosaico, sin franja inferior. */
  const mosaicTiles = count <= 4 ? tiles : [mainTile, ...sideTiles];

  return (
    <>
      <div className={`property-gallery ${layoutClass}`}>
        {count <= 4 ? (
          mosaicTiles.map((tile) => (
            <button
              key={tile.url}
              type="button"
              className={`gallery-tile gallery-tile--${tile.index}`}
              style={{ backgroundImage: `url(${tile.url})` }}
              onClick={() => setLightbox(tile.index)}
              aria-label={tile.label}
            />
          ))
        ) : (
          <>
            <button
              type="button"
              className="gallery-tile gallery-tile--main"
              style={{ backgroundImage: `url(${mainTile.url})` }}
              onClick={() => setLightbox(mainTile.index)}
              aria-label={mainTile.label}
            />
            <div className="gallery-side">
              {sideTiles.map((tile) => (
                <button
                  key={tile.url}
                  type="button"
                  className="gallery-tile gallery-tile--side"
                  style={{ backgroundImage: `url(${tile.url})` }}
                  onClick={() => setLightbox(tile.index)}
                  aria-label={tile.label}
                />
              ))}
            </div>
            {thumbTiles.length > 0 && (
              <div className="gallery-thumbs">
                {thumbTiles.map((tile, i) => (
                  <button
                    key={tile.url}
                    type="button"
                    className="gallery-tile gallery-tile--thumb"
                    style={{ backgroundImage: `url(${tile.url})` }}
                    onClick={() => setLightbox(tile.index)}
                    aria-label={tile.label}
                  >
                    {i === thumbTiles.length - 1 && extra > 0 && (
                      <span className="gallery-more">
                        {tVars("detail.morePhotos", { n: extra })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
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
