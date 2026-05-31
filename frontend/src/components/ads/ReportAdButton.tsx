import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setError("");
    setMsg("");
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

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

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="map-modal-overlay sponsor-report-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-report-title"
          >
            <button
              type="button"
              className="sponsor-report-backdrop"
              aria-label="Cerrar reporte"
              onClick={close}
            />
            <div
              className="card sponsor-report-dialog"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="sponsor-report-dialog-head">
                <h2 id="sponsor-report-title">Reportar anuncio</h2>
                <button
                  type="button"
                  className="sponsor-report-dialog-close"
                  onClick={close}
                  aria-label="Cerrar"
                  disabled={loading}
                >
                  <PrimeIcon name="pi-times" size={18} />
                </button>
              </header>
              <p className="muted sponsor-report-dialog-lead">
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
              <div className="sponsor-report-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={close} disabled={loading}>
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
          </div>,
          document.body,
        )
      : null;

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
      {modal}
    </>
  );
}
