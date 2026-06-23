import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { fetchOwnerPayments, type OwnerPaymentRow } from "../../api/payments";
import { StatusBadge } from "../StatusBadge";
import { formatDate, formatMoney } from "../../utils/format";

const METHOD_LABELS: Record<string, string> = {
  externo: "Pago directo",
  yape: "Yape",
  card: "Tarjeta",
  pagoefectivo: "PagoEfectivo",
};

function methodLabel(method: string): string {
  return METHOD_LABELS[method] || method;
}

function paymentStatusLabel(status: string): string {
  if (status === "pagado") return "Cobrado";
  if (status === "procesando") return "En verificación";
  if (status === "pendiente") return "Pendiente";
  if (status === "fallido") return "Fallido";
  return status;
}

export function OwnerPaymentsPanel() {
  const [rows, setRows] = useState<OwnerPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "externo" | "pagado">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params =
          filter === "externo"
            ? { method: "externo" }
            : filter === "pagado"
              ? { status: "pagado" }
              : undefined;
        const data = await fetchOwnerPayments(params);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "No se pudieron cargar los pagos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === "pagado");
    const sum = paid.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    return { count: paid.length, sum };
  }, [rows]);

  return (
    <section className="owner-payments-section">
      <div className="owner-bookings-intro card">
        <h2 className="owner-bookings-intro-title">Pagos obtenidos</h2>
        <p className="muted">
          Aquí ves todos los cobros de tus reservas: pasarela Hospy y pagos directos reportados por
          huéspedes. En pago directo, el huésped indica número de operación y monto al registrar el
          pago.
        </p>
        {!loading && totals.count > 0 && (
          <p className="owner-payments-summary">
            <strong>{totals.count}</strong> cobro{totals.count === 1 ? "" : "s"} registrado
            {totals.count === 1 ? "" : "s"} en esta vista · Total:{" "}
            <strong>{formatMoney(totals.sum)}</strong>
          </p>
        )}
      </div>

      <div className="owner-payments-filters" role="tablist" aria-label="Filtrar pagos">
        {(
          [
            ["all", "Todos"],
            ["externo", "Pago directo"],
            ["pagado", "Cobrados"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`owner-payments-filter${filter === id ? " is-active" : ""}`}
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando pagos…</p>
      ) : error ? (
        <p className="error-msg">{error}</p>
      ) : rows.length === 0 ? (
        <div className="owner-properties-empty owner-properties-empty--compact">
          <h2>Sin pagos</h2>
          <p className="muted">Cuando recibas cobros por reservas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="owner-payments-list">
          {rows.map((row) => (
            <article key={row.id} className="owner-payment-card card">
              <div className="owner-payment-card-head">
                <h3>
                  {row.accommodation_id != null ? (
                    <Link
                      to={`/hospedajes/${row.accommodation_id}`}
                      className="booking-item-title-link"
                    >
                      {row.hospedaje}
                    </Link>
                  ) : (
                    row.hospedaje
                  )}{" "}
                  · Hab. {row.habitacion}
                </h3>
                <StatusBadge status={row.booking_status} />
              </div>
              <p>
                {row.huesped.nombre} ({row.huesped.email})
              </p>
              <p>
                {formatDate(row.check_in)} → {formatDate(row.check_out)}
              </p>
              <dl className="owner-payment-details">
                <div>
                  <dt>Método</dt>
                  <dd>{methodLabel(row.method)}</dd>
                </div>
                <div>
                  <dt>Estado del pago</dt>
                  <dd>{paymentStatusLabel(row.status)}</dd>
                </div>
                <div>
                  <dt>Monto reserva</dt>
                  <dd>{formatMoney(row.amount)}</dd>
                </div>
                {row.method === "externo" && row.external_operation_number ? (
                  <div>
                    <dt>N.º operación</dt>
                    <dd>{row.external_operation_number}</dd>
                  </div>
                ) : null}
                {row.guest_reported_amount ? (
                  <div>
                    <dt>Monto reportado</dt>
                    <dd>{formatMoney(row.guest_reported_amount)}</dd>
                  </div>
                ) : null}
                {row.paid_at ? (
                  <div>
                    <dt>Cobrado el</dt>
                    <dd>{formatDate(row.paid_at)}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
