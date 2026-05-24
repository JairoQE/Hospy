import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { AccommodationDetail, Paginated, User } from "../api/types";
import { AdminMessageReportsSection } from "../components/AdminMessageReportsSection";
import { displayName, typeLabel } from "../utils/format";

export function AdminModerationPage() {
  const [searchParams] = useSearchParams();
  const tabMensajes = searchParams.get("tab") === "mensajes";
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [pending, setPending] = useState<AccommodationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivoHospedaje, setMotivoHospedaje] = useState<Record<number, string>>({});
  const [motivoPropietario, setMotivoPropietario] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      api.get<Paginated<AccommodationDetail> | AccommodationDetail[]>(
        "/hospedajes/pendientes/",
      ),
    ])
      .then(([owners, hospedajes]) => {
        setPendingOwners(unwrapList(owners));
        setPending(unwrapList(hospedajes));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tabMensajes) {
      document.getElementById("mensajes-reportados")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [tabMensajes]);

  const moderateOwner = async (id: number, aprobado: boolean) => {
    try {
      await api.post(`/auth/propietarios/${id}/aprobar/`, {
        aprobado,
        motivo: aprobado ? "" : motivoPropietario[id] ?? "",
      });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  const moderateAccommodation = async (id: number, aprobado: boolean) => {
    try {
      await api.post(`/hospedajes/${id}/aprobar/`, {
        aprobado,
        motivo: aprobado ? "" : motivoHospedaje[id] ?? "",
      });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Moderación de hospedajes</h1>
      <p className="admin-page-sub">
        Aprueba propietarios, hospedajes y revisa mensajes reportados.
      </p>

      {loading && !tabMensajes && <p className="admin-loading">Cargando…</p>}

      <section className="admin-moderation-section" id="mensajes-reportados">
        <h2 className="admin-section-title">Mensajes de chat reportados</h2>
        <p className="muted section-lead">
          Denuncias de contenido ofensivo, acoso o spam en conversaciones.
        </p>
        <AdminMessageReportsSection />
      </section>

      {!loading && (
        <>
          <section className="admin-moderation-section" id="propietarios-pendientes">
            <h2 className="admin-section-title">Propietarios pendientes</h2>
            {pendingOwners.length === 0 ? (
              <p className="muted">No hay cuentas de propietario por revisar.</p>
            ) : (
              <ul className="admin-card-list">
                {pendingOwners.map((o) => (
                  <li key={o.id} className="admin-card-item">
                    <h3>{displayName(o)}</h3>
                    <p>
                      {o.email}
                      {o.phone ? ` · ${o.phone}` : ""}
                    </p>
                    <div className="admin-field-plain">
                      <span className="admin-field-label">Motivo de rechazo</span>
                      <input
                        placeholder="Obligatorio si rechazas"
                        value={motivoPropietario[o.id] ?? ""}
                        onChange={(e) =>
                          setMotivoPropietario({
                            ...motivoPropietario,
                            [o.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => moderateOwner(o.id, true)}
                      >
                        Aprobar cuenta
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => moderateOwner(o.id, false)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-moderation-section" id="hospedajes-pendientes">
            <h2 className="admin-section-title">Hospedajes pendientes</h2>
            {pending.length === 0 ? (
              <p className="muted">No hay hospedajes pendientes de aprobación.</p>
            ) : (
              <ul className="admin-card-list">
                {pending.map((h) => (
                  <li key={h.id} className="admin-card-item">
                    <h3>{h.name}</h3>
                    <p>
                      {typeLabel(h.type)} · {h.city} · {h.owner_email}
                    </p>
                    <p className="muted">{h.description.slice(0, 200)}…</p>
                    <div className="admin-field-plain">
                      <span className="admin-field-label">Motivo de rechazo</span>
                      <input
                        placeholder="Obligatorio si rechazas"
                        value={motivoHospedaje[h.id] ?? ""}
                        onChange={(e) =>
                          setMotivoHospedaje({
                            ...motivoHospedaje,
                            [h.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => moderateAccommodation(h.id, true)}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => moderateAccommodation(h.id, false)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
