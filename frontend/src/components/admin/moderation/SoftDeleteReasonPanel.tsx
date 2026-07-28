type Props = {
  motivo: string;
  onMotivoChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  title?: string;
  confirmLabel?: string;
};

export function SoftDeleteReasonPanel({
  motivo,
  onMotivoChange,
  onConfirm,
  onCancel,
  busy = false,
  title = "Justificación para el propietario",
  confirmLabel = "Eliminar y notificar",
}: Props) {
  const canConfirm = motivo.trim().length >= 5;

  return (
    <div className="admin-mod-reject-panel">
      <p className="admin-mod-reject-title">{title}</p>
      <p className="muted" style={{ margin: "0 0 0.65rem", fontSize: "0.85rem" }}>
        El propietario recibirá esta explicación en su bandeja de notificaciones.
      </p>
      <div className="admin-mod-reject-field">
        <span className="admin-mod-reject-label">Justificación (mín. 5 caracteres)</span>
        <textarea
          rows={3}
          placeholder="Ej. Incumplimiento de políticas de la plataforma / datos no verificables…"
          value={motivo}
          onChange={(e) => onMotivoChange(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="admin-mod-reject-actions">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={!canConfirm || busy}
          onClick={onConfirm}
        >
          {busy ? "Eliminando…" : confirmLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
