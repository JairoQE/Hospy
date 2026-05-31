import type { BrowseTile } from "../../../api/types";
import { BrowseTilesSection } from "../../home/BrowseTilesSection";
import { PrimeIcon } from "../../PrimeIcon";
import { GROUP_SECTION_COPY, type HomeContentGroup } from "../../../utils/adminHomeContentData";

type Props = {
  open: boolean;
  group: HomeContentGroup;
  tiles: BrowseTile[];
  onClose: () => void;
};

export function HomePreviewModal({ open, group, tiles, onClose }: Props) {
  if (!open) return null;

  const copy = GROUP_SECTION_COPY[group];
  const activeTiles = tiles.filter((t) => t.is_active !== false);

  return (
    <div className="admin-home-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-home-modal admin-home-preview-modal"
        role="dialog"
        aria-label="Vista previa de la home"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-home-modal-header">
          <div>
            <h2>Vista previa de la home</h2>
            <p className="muted">Así se verá la sección con el orden y tarjetas activas actuales.</p>
          </div>
          <button
            type="button"
            className="messenger-header-icon messenger-header-icon--close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="admin-home-preview-body">
          <div className="admin-home-preview-frame">
            <div className="admin-home-preview-chrome">
              <span />
              <span />
              <span />
            </div>
            <div className="admin-home-preview-content container">
              <BrowseTilesSection
                title={copy.previewTitle}
                subtitle={copy.previewSubtitle}
                tiles={activeTiles}
                onSelect={() => {}}
              />
            </div>
          </div>
          {activeTiles.length === 0 && (
            <p className="muted admin-home-preview-empty">
              <PrimeIcon name="pi-info-circle" size={16} /> No hay tarjetas activas en esta pestaña.
            </p>
          )}
        </div>
        <footer className="admin-home-modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar vista previa
          </button>
        </footer>
      </div>
    </div>
  );
}
