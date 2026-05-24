import type { BrowseTile } from "../../api/types";

import { resolveMediaUrl } from "../../utils/media";

import { PrimeIcon } from "../PrimeIcon";
import { tileCountBadge, tileIcon } from "../../utils/tileIcons";

import { BrowseCarousel } from "./BrowseCarousel";

import { SkeletonBrowseTilesRow } from "../ui/Skeleton";



interface Props {

  tiles: BrowseTile[];

  onSelect: (tile: BrowseTile) => void;

  ariaLabel?: string;

  loading?: boolean;

}



export function BrowseTilesCarousel({ tiles, onSelect, ariaLabel, loading = false }: Props) {

  if (loading) return <SkeletonBrowseTilesRow count={5} />;

  if (tiles.length === 0) return null;



  return (

    <BrowseCarousel ariaLabel={ariaLabel ?? "Departamentos"} loop>

      {tiles.map((tile) => {

        const imageUrl = resolveMediaUrl(tile.image_url);

        const iconName = tileIcon(tile);

        const count = tileCountBadge(tile);

        const gradient =

          tile.gradient_css ||

          "linear-gradient(135deg, var(--home-deep) 0%, var(--home-turquoise) 100%)";



        return (

          <button

            key={tile.id}

            type="button"

            className="browse-tile browse-tile-carousel browse-tile--v2"

            onClick={() => onSelect(tile)}

          >

            <span className="browse-tile-image browse-tile-image-lg browse-tile-image--v2">

              {imageUrl ? (

                <img src={imageUrl} alt="" loading="lazy" decoding="async" />

              ) : (

                <span

                  className="browse-tile-image-fallback"

                  style={{ background: gradient }}

                />

              )}

              <PrimeIcon
                name={iconName}
                className="browse-tile-emoji browse-tile-emoji--lg"
              />

              {count != null && <span className="browse-tile-badge">{count} aloj.</span>}

            </span>

            <span className="browse-tile-label">{tile.title}</span>

            {tile.subtitle && !count && <span className="browse-tile-sub">{tile.subtitle}</span>}

          </button>

        );

      })}

    </BrowseCarousel>

  );

}


