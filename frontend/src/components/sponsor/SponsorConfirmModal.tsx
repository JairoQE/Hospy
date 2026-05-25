type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SponsorConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="sponsor-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-confirm-title"
      onClick={onCancel}
    >
      <div className="sponsor-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="sponsor-confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="sponsor-modal-actions">
          <button type="button" className="sponsor-btn sponsor-btn--outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`sponsor-btn ${danger ? "sponsor-btn--danger" : "sponsor-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
