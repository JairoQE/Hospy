import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { fetchMessageReports, resolveMessageReport } from "../api/messaging";
import type { MessageReport } from "../api/types";
import { formatRelativeTime } from "../utils/relativeTime";

export function AdminMessageReportsSection() {
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetchMessageReports("pendiente")
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: number, status: "revisado" | "descartado") => {
    try {
      await resolveMessageReport(id, {
        status,
        admin_notes: notes[id] ?? "",
      });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error al resolver");
    }
  };

  if (loading) {
    return <p className="muted">Cargando reportes de mensajes…</p>;
  }

  if (reports.length === 0) {
    return (
      <p className="muted">No hay mensajes de chat reportados pendientes de revisión.</p>
    );
  }

  return (
    <ul className="booking-list admin-message-reports">
      {reports.map((r) => (
        <li key={r.id} className="card">
          <div className="admin-report-head">
            <span className="admin-report-badge">{r.reason_label}</span>
            <span className="muted">{formatRelativeTime(r.created_at)}</span>
          </div>
          <p>
            <strong>Reportado por:</strong> {r.reporter_name} ({r.reporter_email})
          </p>
          <p>
            <strong>Autor del mensaje:</strong> {r.sender_name} ({r.sender_email})
          </p>
          <p>
            <strong>Hospedaje:</strong>{" "}
            <Link to={`/hospedajes/${r.accommodation_id}`}>{r.accommodation_name}</Link>
          </p>
          <blockquote className="report-message-quote">{r.message_body}</blockquote>
          {r.detail && (
            <p className="muted">
              <strong>Detalle del reporte:</strong> {r.detail}
            </p>
          )}
          <label>
            Notas internas (opcional)
            <input
              placeholder="Acción tomada, observaciones…"
              value={notes[r.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => resolve(r.id, "revisado")}
            >
              Marcar revisado
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => resolve(r.id, "descartado")}
            >
              Descartar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
