import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { useSponsorAds } from "../../context/SponsorAdsContext";
import { resolveMediaUrl } from "../../utils/media";
import { ReportAdButton } from "./ReportAdButton";

type Props = {
  variant: "sidebar" | "mobile-banner";
  side?: "left" | "right";
};

export function SponsorAdSlot({ variant, side }: Props) {
  const { t } = useLocaleCurrency();
  const { current, loading, ads } = useSponsorAds();

  if (loading || !current?.media_url) {
    if (variant === "mobile-banner") return null;
    return (
      <aside
        className={`sponsor-ad-slot sponsor-ad-slot--sidebar sponsor-ad-slot--${side}`}
        aria-hidden
      />
    );
  }

  const mediaUrl = resolveMediaUrl(current.media_url) ?? current.media_url;
  const isVideo = current.media_type === "video";

  const media = isVideo ? (
    <video
      key={current.id}
      className="sponsor-ad-media"
      src={mediaUrl}
      muted
      playsInline
      autoPlay
      loop={ads.length <= 1}
      aria-label={current.title}
    />
  ) : (
    <img
      key={current.id}
      className="sponsor-ad-media"
      src={mediaUrl}
      alt={current.title}
      loading="lazy"
    />
  );

  const creative = (
    <>
      {media}
      {current.title && <span className="sponsor-ad-title">{current.title}</span>}
    </>
  );

  const content = (
    <div className="sponsor-ad-link-wrap">
      <div className="sponsor-ad-top-bar">
        <span className="sponsor-ad-label">{t("sponsor.adLabel")}</span>
        <ReportAdButton adId={current.id} />
      </div>
      {current.link_url ? (
        <a
          href={current.link_url}
          className="sponsor-ad-link"
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          {creative}
        </a>
      ) : (
        <div className="sponsor-ad-link">{creative}</div>
      )}
    </div>
  );

  if (variant === "mobile-banner") {
    return (
      <aside className="sponsor-ad-slot sponsor-ad-slot--mobile" aria-label={t("sponsor.adLabel")}>
        {content}
      </aside>
    );
  }

  return (
    <aside
      className={`sponsor-ad-slot sponsor-ad-slot--sidebar sponsor-ad-slot--${side}`}
      aria-label={t("sponsor.adLabel")}
    >
      {content}
    </aside>
  );
}
