import type { BrowseTile } from "../../../api/types";
import { PrimeIcon } from "../../PrimeIcon";
import { formatClicks } from "../../../utils/adminHomeContentData";
import { tileIcon } from "../../../utils/tileIcons";
import { resolveMediaUrl } from "../../../utils/media";

type Props = {
  tile: BrowseTile;
  index: number;
  selected: boolean;
  dragging: boolean;
  dragOver: boolean;
  onSelectChange: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
};

export function HomeContentTileCard({
  tile,
  index,
  selected,
  dragging,
  dragOver,
  onSelectChange,
  onEdit,
  onDelete,
  onToggleActive,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: Props) {
  const img = resolveMediaUrl(tile.image_url);
  const clicks = tile.clicks_30d ?? 0;
  const active = tile.is_active !== false;

  return (
    <li
      className={`admin-home-tile-card${dragging ? " is-dragging" : ""}${
        dragOver ? " is-drag-over" : ""
      }${!active ? " is-inactive" : ""}`}
      onDragEnter={() => onDragEnter(index)}
    >
      {dragOver && <div className="admin-home-drop-indicator" aria-hidden />}
      <div className="admin-home-tile-card-inner">
        <button
          type="button"
          className="admin-home-drag-handle"
          draggable
          aria-label={`Reordenar ${tile.title}`}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(index));
            onDragStart(index);
          }}
          onDragEnd={onDragEnd}
        >
          <PrimeIcon name="pi-bars" size={16} />
        </button>

        <label className="admin-home-tile-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
            aria-label={`Seleccionar ${tile.title}`}
          />
        </label>

        <div className="admin-home-tile-visual">
          <span
            className="browse-tile-image browse-tile-image--v2"
            style={
              img ? { backgroundImage: `url(${img})` } : { background: tile.gradient_css }
            }
          >
            <PrimeIcon name={tileIcon(tile)} className="browse-tile-emoji" />
          </span>
          <span className="admin-home-order-badge">{tile.order ?? index + 1}</span>
        </div>

        <div className="admin-home-tile-body">
          <div className="admin-home-tile-head">
            <h3>{tile.title}</h3>
            <label className="admin-home-switch" title={active ? "Desactivar" : "Activar"}>
              <input type="checkbox" checked={active} onChange={onToggleActive} />
              <span className="admin-home-switch-slider" />
            </label>
          </div>
          {tile.subtitle && <p className="admin-home-tile-desc">{tile.subtitle}</p>}
          <div className="admin-home-tile-meta">
            <code className="admin-home-filter-badge">{tile.filter_value}</code>
            <span className="admin-home-metric">
              <PrimeIcon name="pi-chart-line" size={12} />
              {formatClicks(clicks)} clics · 30 d
            </span>
          </div>
        </div>

        <div className="admin-home-tile-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar">
            <PrimeIcon name="pi-pencil" size={14} />
            Editar
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm admin-home-delete-btn"
            onClick={onDelete}
            title="Eliminar"
          >
            <PrimeIcon name="pi-trash" size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}
