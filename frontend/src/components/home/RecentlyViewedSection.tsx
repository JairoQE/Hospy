import { Link } from "react-router-dom";

import type { RecentViewItem } from "../../hooks/useRecentlyViewed";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney, typeLabel } from "../../utils/format";
import { resolveMediaUrl } from "../../utils/media";
import { HorizontalCarousel } from "../ui/HorizontalCarousel";

interface Props {
  items: RecentViewItem[];
}

export function RecentlyViewedSection({ items }: Props) {
  const { t } = useLocaleCurrency();

  if (items.length === 0) return null;

  return (
    <section className="home-block fade-in recently-section">
      <h2 className="home-block-title">{t("home.recentTitle")}</h2>
      <p className="muted home-block-sub">{t("home.recentSub")}</p>
      <HorizontalCarousel itemWidth={220} ariaLabel={t("home.recentSub")}>
        {items.map((item) => {
          const fotoUrl = resolveMediaUrl(item.foto_principal);
          const rating = Number(item.average_rating) || 0;
          return (
            <Link
              key={item.id}
              to={`/hospedajes/${item.id}`}
              className="recent-card"
            >
              <div
                className="recent-card-image"
                style={fotoUrl ? { backgroundImage: `url(${fotoUrl})` } : undefined}
              >
                {!fotoUrl && <span className="recent-card-placeholder">{t("common.noPhoto")}</span>}
                <span className="recent-card-type">{typeLabel(item.type)}</span>
              </div>
              <div className="recent-card-body">
                <h3>{item.name}</h3>
                <p className="recent-card-city">{item.city}</p>
                <p className="recent-card-price">
                  {item.precio_desde != null ? (
                    <>
                      {t("price.from")}{" "}
                      <strong>{formatMoney(item.precio_desde)}</strong>
                    </>
                  ) : (
                    t("price.consult")
                  )}
                  <span className="recent-card-rating">
                    ★ {rating > 0 ? rating.toFixed(1) : t("price.new")}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}
