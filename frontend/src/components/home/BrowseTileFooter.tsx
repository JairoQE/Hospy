import type { BrowseTile } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney } from "../../utils/format";

export function BrowseTileFooter({ tile }: { tile: BrowseTile }) {
  const { t } = useLocaleCurrency();
  const count = tile.hotels_count ?? 0;
  const hasStats = count > 0;
  const subtitle = tile.subtitle?.trim();

  return (
    <div className="browse-tile-footer">
      <span
        className={`browse-tile-footer-line browse-tile-footer-line--primary${
          hasStats ? " browse-tile-footer-line--meta" : " browse-tile-footer-line--sub"
        }`}
      >
        {hasStats ? (
          <>
            <strong>{count.toLocaleString()}</strong> {t("home.tileLocalsSuffix")}
          </>
        ) : (
          subtitle || "\u00A0"
        )}
      </span>
      <span
        className={`browse-tile-footer-line browse-tile-footer-line--secondary${
          hasStats && tile.price_avg != null ? " browse-tile-footer-line--price" : ""
        }`}
        aria-hidden={!hasStats || tile.price_avg == null}
      >
        {hasStats && tile.price_avg != null ? (
          <>
            <strong>{formatMoney(tile.price_avg)}</strong> {t("home.priceAvgSuffix")}
          </>
        ) : (
          "\u00A0"
        )}
      </span>
    </div>
  );
}
