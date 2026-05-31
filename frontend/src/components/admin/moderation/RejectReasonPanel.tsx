type Preset = { value: string; label: string };

type Props = {
  presets: readonly Preset[];
  preset: string;
  custom: string;
  onPresetChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
};

export function RejectReasonPanel({
  presets,
  preset,
  custom,
  onPresetChange,
  onCustomChange,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar rechazo",
}: Props) {
  const needsCustom = preset === "otro";
  const canConfirm = preset && (!needsCustom || custom.trim().length >= 3);

  return (
    <div className="admin-mod-reject-panel">
      <p className="admin-mod-reject-title">Motivo de rechazo</p>
      <div className="admin-mod-reject-field">
        <span className="admin-mod-reject-label">Motivo</span>
        <select value={preset} onChange={(e) => onPresetChange(e.target.value)}>
          <option value="">Selecciona un motivo…</option>
          {presets.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {needsCustom && (
        <div className="admin-mod-reject-field">
          <span className="admin-mod-reject-label">Detalle (mín. 3 caracteres)</span>
          <textarea
            rows={2}
            placeholder="Explica el motivo al usuario…"
            value={custom}
            onChange={(e) => onCustomChange(e.target.value)}
          />
        </div>
      )}
      <div className="admin-mod-reject-actions">
        <button type="button" className="btn btn-danger btn-sm" disabled={!canConfirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
