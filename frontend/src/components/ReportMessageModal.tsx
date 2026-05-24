import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  MESSAGE_REPORT_REASONS,
  reportChatMessage,
  type MessageReportReason,
} from "../api/messaging";
import type { ChatMessage } from "../api/types";

type Props = {
  message: ChatMessage;
  onClose: () => void;
  onReported: () => void;
};

export function ReportMessageModal({ message, onClose, onReported }: Props) {
  const [reason, setReason] = useState<MessageReportReason>("ofensivo");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await reportChatMessage(message.id, {
        reason,
        detail: detail.trim() || undefined,
      });
      setSuccess(res.detail);
      onReported();
      window.setTimeout(onClose, 1600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="map-modal-overlay report-message-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="report-message-title"
      onClick={onClose}
    >
      <form
        className="card report-message-modal"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="report-message-title">Reportar mensaje</h2>
        <p className="muted">
          El administrador revisará este mensaje de <strong>{message.sender_name}</strong>.
          No se le notificará que lo reportaste.
        </p>
        <blockquote className="report-message-quote">{message.body}</blockquote>

        <label>
          Motivo
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as MessageReportReason)}
            required
          >
            {MESSAGE_REPORT_REASONS.map((r) => (
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
            maxLength={500}
            placeholder="Describe brevemente qué ocurrió…"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </label>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <div className="report-message-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Enviando…" : "Enviar reporte"}
          </button>
        </div>
      </form>
    </div>
  );
}
