import { useState } from "react";
import { ApiError } from "../api/client";
import { formatApiError } from "../api/errors";
import { registerBookingRefund } from "../api/bookingRefunds";
import { PrimeIcon } from "./PrimeIcon";

interface Props {
  bookingId: number;
  suggestedAmount: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function OwnerRefundModal({ bookingId, suggestedAmount, onClose, onSuccess }: Props) {
  const [operationNumber, setOperationNumber] = useState("");
  const [amount, setAmount] = useState(suggestedAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerBookingRefund(bookingId, {
        operation_number: operationNumber.trim(),
        reported_amount: amount,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? formatApiError(err.data) : "No se pudo registrar el reembolso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card owner-refund-modal"
        role="dialog"
        aria-labelledby="owner-refund-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="owner-refund-title">Registrar reembolso directo</h2>
        <p className="muted">
          Transfiere al huésped fuera de Hospy e ingresa los datos de la operación. El huésped
          deberá confirmar que lo recibió.
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label>
            Número de operación
            <input
              type="text"
              value={operationNumber}
              onChange={(e) => setOperationNumber(e.target.value)}
              minLength={4}
              required
              autoFocus
            />
          </label>
          <label>
            Monto reembolsado (S/)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <PrimeIcon name="pi-check" size={16} />
              {loading ? "Guardando…" : "Registrar reembolso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
