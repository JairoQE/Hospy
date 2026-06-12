import type { BrowseTile } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney } from "../../utils/format";

export function BrowseTileStats({ tile }: { tile: BrowseTile }) {
  const { t } = useLocaleCurrency();
  const count = tile.hotels_count ?? 0;

  if (count <= 0) return null;

  return (
    <>
      <span className="browse-tile-meta">
        <strong>{count.toLocaleString()}</strong> {t("home.tileLocalsSuffix")}
      </span>
      {tile.price_avg != null && (
        <span className="browse-tile-price">
          <strong>{formatMoney(tile.price_avg)}</strong> {t("home.priceAvgSuffix")}
        </span>
      )}
    </>
  );
}
