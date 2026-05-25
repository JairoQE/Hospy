import { useState } from "react";
import { ApiError, api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  adId: number;
  className?: string;
};

const REASONS = [
  { value: "inapropiado", label: "Contenido inapropiado" },
  { value: "enganoso", label: "Engañoso o falso" },
  { value: "spam", label: "Spam" },
  { value: "otro", label: "Otro" },
] as const;

export function ReportAdButton({ adId, className = "" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("inapropiado");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const submit = async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await api.post(`/anuncios/${adId}/reportar/`, { reason, detail: detail.trim() });
      setMsg("Reporte enviado. Gracias.");
      window.setTimeout(() => setOpen(false), 1200);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`sponsor-ad-report-btn ${className}`.trim()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Reportar anuncio"
        aria-label="Reportar anuncio inapropiado"
      >
        <PrimeIcon name="pi-flag" size={14} />
      </button>

      {open && (
        <div
          className="sponsor-report-overlay"
          role="dialog"
          aria-modal
          onClick={() => setOpen(false)}
        >
          <div className="sponsor-report-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Reportar anuncio</h3>
            <p className="muted">
              Si el contenido es inapropiado, el equipo lo revisará. La cuenta del patrocinador
              no se elimina; solo se puede retirar este anuncio.
            </p>
            <label>
              Motivo
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Detalle (opcional)
              <textarea
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Describe brevemente el problema"
              />
            </label>
            {error && <p className="error-msg">{error}</p>}
            {msg && <p className="success-msg">{msg}</p>}
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => void submit()}
              >
                {loading ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
