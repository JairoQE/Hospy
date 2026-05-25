import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { AccommodationDetail, Paginated, SponsorAdReport, User } from "../api/types";
import { resolveMediaUrl } from "../utils/media";
import { AdminMessageReportsSection } from "../components/AdminMessageReportsSection";
import { displayName, typeLabel } from "../utils/format";

export function AdminModerationPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tabMensajes = searchParams.get("tab") === "mensajes";
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [pendingSponsors, setPendingSponsors] = useState<User[]>([]);
  const [adReports, setAdReports] = useState<SponsorAdReport[]>([]);
  const [pending, setPending] = useState<AccommodationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivoHospedaje, setMotivoHospedaje] = useState<Record<number, string>>({});
  const [motivoPropietario, setMotivoPropietario] = useState<Record<number, string>>({});
  const [motivoPatrocinador, setMotivoPatrocinador] = useState<Record<number, string>>({});
  const [warningAnuncio, setWarningAnuncio] = useState<Record<number, string>>({});
  const [notasAnuncio, setNotasAnuncio] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      api.get<User[] | Paginated<User>>("/auth/patrocinadores-pendientes/"),
      api.get<SponsorAdReport[] | Paginated<SponsorAdReport>>("/anuncios/reportados/"),
      api.get<Paginated<AccommodationDetail> | AccommodationDetail[]>(
        "/hospedajes/pendientes/",
      ),
    ])
      .then(([owners, sponsors, reports, hospedajes]) => {
        setPendingOwners(unwrapList(owners));
        setPendingSponsors(unwrapList(sponsors));
        setAdReports(unwrapList(reports));
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

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [location.hash, loading]);

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

  const moderateSponsor = async (id: number, aprobado: boolean) => {
    try {
      await api.post(`/auth/patrocinadores/${id}/aprobar/`, {
        aprobado,
        motivo: aprobado ? "" : motivoPatrocinador[id] ?? "",
      });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  const resolveAdReport = async (id: number, accion: "baja" | "descartar") => {
    try {
      await api.post(`/anuncios/reportados/${id}/resolver/`, {
        accion,
        warning: accion === "baja" ? warningAnuncio[id] ?? "" : "",
        admin_notes: notasAnuncio[id] ?? "",
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
        Aprueba cuentas, revisa anuncios reportados por usuarios y hospedajes pendientes.
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

          <section className="admin-moderation-section" id="patrocinadores-pendientes">
            <h2 className="admin-section-title">Patrocinadores pendientes</h2>
            {pendingSponsors.length === 0 ? (
              <p className="muted">No hay cuentas de patrocinador por revisar.</p>
            ) : (
              <ul className="admin-card-list">
                {pendingSponsors.map((s) => (
                  <li key={s.id} className="admin-card-item">
                    <h3>{displayName(s)}</h3>
                    <p>{s.email}</p>
                    <div className="admin-field-plain">
                      <span className="admin-field-label">Motivo de rechazo</span>
                      <input
                        placeholder="Obligatorio si rechazas"
                        value={motivoPatrocinador[s.id] ?? ""}
                        onChange={(e) =>
                          setMotivoPatrocinador({
                            ...motivoPatrocinador,
                            [s.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => moderateSponsor(s.id, true)}
                      >
                        Aprobar patrocinador
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => moderateSponsor(s.id, false)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-moderation-section" id="anuncios-reportados">
            <h2 className="admin-section-title">Anuncios reportados por usuarios</h2>
            <p className="muted section-lead">
              Si confirmas la denuncia, se da de baja solo ese anuncio y se envía una advertencia
              al patrocinador (su cuenta sigue activa).
            </p>
            {adReports.length === 0 ? (
              <p className="muted">No hay reportes de anuncios pendientes.</p>
            ) : (
              <ul className="admin-card-list">
                {adReports.map((rep) => {
                  const url = resolveMediaUrl(rep.ad_media_url);
                  return (
                    <li key={rep.id} className="admin-card-item">
                      <h3>{rep.ad_title}</h3>
                      <p className="muted">
                        Patrocinador: {rep.sponsor_name} ({rep.sponsor_email}) · Reportó:{" "}
                        {rep.reporter_name} · {rep.reason_label}
                      </p>
                      {rep.detail && <p>{rep.detail}</p>}
                      {url && (
                        <div className="sponsor-ad-item-preview">
                          <img src={url} alt="" />
                        </div>
                      )}
                      <div className="admin-field-plain">
                        <span className="admin-field-label">
                          Advertencia al patrocinador (obligatoria si das de baja)
                        </span>
                        <textarea
                          rows={2}
                          placeholder="Ej.: Tu anuncio infringe las normas de contenido…"
                          value={warningAnuncio[rep.id] ?? ""}
                          onChange={(e) =>
                            setWarningAnuncio({ ...warningAnuncio, [rep.id]: e.target.value })
                          }
                        />
                      </div>
                      <div className="admin-field-plain">
                        <span className="admin-field-label">Notas internas (opcional)</span>
                        <input
                          value={notasAnuncio[rep.id] ?? ""}
                          onChange={(e) =>
                            setNotasAnuncio({ ...notasAnuncio, [rep.id]: e.target.value })
                          }
                        />
                      </div>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => resolveAdReport(rep.id, "baja")}
                        >
                          Dar de baja anuncio
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => resolveAdReport(rep.id, "descartar")}
                        >
                          Descartar reporte
                        </button>
                      </div>
                    </li>
                  );
                })}
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
