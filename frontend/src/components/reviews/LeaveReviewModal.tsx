import { useState } from "react";
import { ApiError, api } from "../../api/client";
import { formatApiError } from "../../api/errors";
import { PrimeIcon } from "../PrimeIcon";
import { ReviewStayMeta } from "./ReviewStayMeta";

type Props = {
  open: boolean;
  accommodationId: number;
  bookingId: number;
  hospedajeName: string;
  habitacion?: string;
  checkIn?: string;
  checkOut?: string;
  totalAmount?: string | number;
  onClose: () => void;
  onSuccess: () => void;
};

export function LeaveReviewModal({
  open,
  accommodationId,
  bookingId,
  hospedajeName,
  habitacion,
  checkIn,
  checkOut,
  totalAmount,
  onClose,
  onSuccess,
}: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (text.length < 10) {
      setError("Escribe al menos 10 caracteres en tu comentario.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/resenas/", {
        accommodation: accommodationId,
        booking: bookingId,
        rating,
        comment: text,
      });
      onSuccess();
      onClose();
      setComment("");
      setRating(5);
    } catch (err) {
      setError(
        err instanceof ApiError ? formatApiError(err.data) : "No se pudo enviar la reseña.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="leave-review-overlay"
      role="presentation"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="leave-review-modal card-elevated"
        role="dialog"
        aria-labelledby="leave-review-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="leave-review-head">
          <h2 id="leave-review-title">Dejar reseña</h2>
          <button
            type="button"
            className="leave-review-close"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <PrimeIcon name="pi-times" size={18} />
          </button>
        </header>

        <p className="muted leave-review-sub">
          Tu opinión sobre <strong>{hospedajeName}</strong> ayuda a otros viajeros y aparecerá en la
          ficha del hospedaje al enviarla.
        </p>
        <ReviewStayMeta
          habitacion={habitacion}
          checkIn={checkIn}
          checkOut={checkOut}
          totalAmount={totalAmount}
          className="leave-review-stay muted"
        />

        <form onSubmit={submit}>
          <fieldset className="leave-review-stars">
            <legend className="sr-only">Puntuación</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`leave-review-star${n <= rating ? " is-active" : ""}`}
                aria-label={`${n} estrellas`}
                aria-pressed={n <= rating}
                disabled={submitting}
                onClick={() => setRating(n)}
              >
                <PrimeIcon name="pi-star-fill" size={22} />
              </button>
            ))}
          </fieldset>

          <label className="leave-review-label" htmlFor="leave-review-comment">
            Comentario
          </label>
          <textarea
            id="leave-review-comment"
            className="leave-review-textarea"
            rows={4}
            maxLength={2000}
            placeholder="Cuéntanos cómo fue tu estadía…"
            value={comment}
            disabled={submitting}
            onChange={(e) => setComment(e.target.value)}
          />

          {error && (
            <p className="error-msg leave-review-error" role="alert">
              {error}
            </p>
          )}

          <div className="leave-review-actions">
            <button type="button" className="btn btn-ghost" disabled={submitting} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar reseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
