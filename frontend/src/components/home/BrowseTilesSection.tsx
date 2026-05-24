import type { BrowseTile } from "../../api/types";

import { resolveMediaUrl } from "../../utils/media";

import { PrimeIcon } from "../PrimeIcon";
import { tileCountBadge, tileIcon } from "../../utils/tileIcons";

import { SkeletonBrowseTilesRow } from "../ui/Skeleton";



interface Props {

  title: string;

  subtitle?: string;

  tiles: BrowseTile[];

  loading?: boolean;

  onSelect: (tile: BrowseTile) => void;

}



export function BrowseTilesSection({ title, subtitle, tiles, loading = false, onSelect }: Props) {

  if (!loading && tiles.length === 0) return null;



  return (

    <section className="home-block fade-in">

      <h2 className="home-block-title">{title}</h2>

      {subtitle && <p className="muted home-block-sub">{subtitle}</p>}

      {loading ? (

        <SkeletonBrowseTilesRow count={Math.min(tiles.length || 4, 5)} />

      ) : (

        <div className={`browse-tiles-row browse-tiles-row--v2 browse-tiles-row--count-${Math.min(tiles.length, 6)}`}>

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

                className="browse-tile browse-tile-fill browse-tile--v2"

                onClick={() => onSelect(tile)}

              >

                <span

                  className="browse-tile-image browse-tile-image--v2"

                  style={

                    imageUrl

                      ? { backgroundImage: `url(${imageUrl})` }

                      : { background: gradient }

                  }

                >

                  <PrimeIcon name={iconName} className="browse-tile-emoji" />

                  {count != null && (

                    <span className="browse-tile-badge">{count} aloj.</span>

                  )}

                </span>

                <span className="browse-tile-label">{tile.title}</span>

                {tile.subtitle && !count && (

                  <span className="browse-tile-sub">{tile.subtitle}</span>

                )}

              </button>

            );

          })}

        </div>

      )}

    </section>

  );

}


