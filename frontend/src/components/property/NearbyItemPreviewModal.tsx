import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { NearbyExploreItem } from "../../api/nearby";
import { resolvePartnerDetailUrl } from "../../config/partnerFrontends";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { resolveMediaUrl } from "../../utils/media";
import { formatDate } from "../../utils/format";

type Props = {
  item: NearbyExploreItem | null;
  open: boolean;
  onClose: () => void;
};

function providerName(item: NearbyExploreItem): string {
  if (item.provider_label) return item.provider_label;
  if (item.source === "restopoint") return "RestoPoint";
  if (item.source === "actify") return "Actify";
  if (item.source === "conecta_tingo") return "Conecta Tingo";
  return "Hospy";
}

export function NearbyItemPreviewModal({ item, open, onClose }: Props) {
  const { t, tVars } = useLocaleCurrency();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !item || typeof document === "undefined") return null;

  const imageUrl = resolveMediaUrl(item.image_url);
  const provider = providerName(item);
  const partnerUrl = resolvePartnerDetailUrl(item);

  return createPortal(
    <div
      className="nearby-preview-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="nearby-preview-title"
      onClick={onClose}
    >
      <div
        className="nearby-preview-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="nearby-preview-close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          ×
        </button>

        <div
          className="nearby-preview-media"
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
        >
          <span className="nearby-preview-badge">{provider}</span>
        </div>

        <div className="nearby-preview-body">
          <h2 id="nearby-preview-title">{item.name}</h2>
          {item.subtitle ? <p className="muted">{item.subtitle}</p> : null}
          {item.address ? <p>{item.address}</p> : null}

          <ul className="nearby-preview-facts">
            {item.distance_km != null ? (
              <li>
                <strong>{t("detail.nearbyDistance")}</strong> {item.distance_km} km
              </li>
            ) : null}
            {item.rating != null ? (
              <li>
                <strong>{t("detail.nearbyRating")}</strong> ★ {item.rating}
              </li>
            ) : null}
            {item.entry_price ? (
              <li>
                <strong>{t("detail.nearbyEntry")}</strong> {item.entry_price}
              </li>
            ) : null}
            {item.interest_level != null ? (
              <li>
                <strong>{t("detail.nearbyInterest")}</strong> {item.interest_level}/10
              </li>
            ) : null}
            {item.start_date ? (
              <li>
                <strong>{t("detail.nearbyDate")}</strong> {formatDate(item.start_date)}
              </li>
            ) : null}
          </ul>

          <div className="nearby-preview-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t("common.close")}
            </button>
            {partnerUrl ? (
              <a
                className="btn btn-primary"
                href={partnerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                {tVars("detail.nearbyViewOn", { provider })}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
