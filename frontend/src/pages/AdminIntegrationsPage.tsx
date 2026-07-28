import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decideIntegrationClient,
  fetchAdminIntegrationClients,
  revokeIntegrationClient,
  type IntegrationClient,
  type IntegrationClientStatus,
} from "../api/integrationClients";
import {
  fetchSistemaInterfaces,
  fetchSistemaProtocolos,
  type InterfacesCatalog,
  type ProtocolsCatalog,
  type SistemaInterface,
} from "../api/sistemaInteroperability";
import { ApiError } from "../api/client";
import { showAdminToast } from "../components/admin/AdminUsersToast";
import { PrimeIcon } from "../components/PrimeIcon";

type Tab = "apis" | "clientes";

export function AdminIntegrationsPage() {
  const [tab, setTab] = useState<Tab>("apis");

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Integración</h1>
          <p className="muted">
            Catálogo de APIs e interfaces externas conectadas a Hospy, y gestión de clientes con
            API Key.
          </p>
        </div>
      </header>

      <div className="admin-integ-tabs" role="tablist" aria-label="Secciones de integración">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "apis"}
          className={`admin-integ-tab${tab === "apis" ? " is-active" : ""}`}
          onClick={() => setTab("apis")}
        >
          <PrimeIcon name="pi-sitemap" size={16} />
          APIs integradas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "clientes"}
          className={`admin-integ-tab${tab === "clientes" ? " is-active" : ""}`}
          onClick={() => setTab("clientes")}
        >
          <PrimeIcon name="pi-key" size={16} />
          Clientes de API
        </button>
      </div>

      {tab === "apis" ? <ApisIntegradasPanel /> : <ClientesIntegracionPanel />}
    </div>
  );
}

function ApisIntegradasPanel() {
  const [catalog, setCatalog] = useState<InterfacesCatalog | null>(null);
  const [protocols, setProtocols] = useState<ProtocolsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ok" | "down">("all");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ifaces, protos] = await Promise.all([
        fetchSistemaInterfaces(),
        fetchSistemaProtocolos().catch(() => null),
      ]);
      setCatalog(ifaces);
      setProtocols(protos);
    } catch (err) {
      showAdminToast(
        err instanceof ApiError ? err.message : "No se pudo cargar el catálogo",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const list = useMemo(() => {
    const rows = catalog?.interfaces ?? [];
    if (filter === "ok") return rows.filter((i) => i.functional);
    if (filter === "down") return rows.filter((i) => !i.functional);
    return rows;
  }, [catalog, filter]);

  if (loading) {
    return <p className="muted">Cargando APIs integradas…</p>;
  }

  if (!catalog) {
    return (
      <p className="muted">
        No hay datos del catálogo.{" "}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
          Reintentar
        </button>
      </p>
    );
  }

  return (
    <div className="admin-apis-panel">
      <div className="admin-kpi-grid admin-apis-kpis">
        <div className="admin-kpi-card">
          <div className="admin-kpi-card-top">
            <span className="admin-kpi-icon">
              <PrimeIcon name="pi-share-alt" size={18} />
            </span>
          </div>
          <p className="admin-kpi-value">{catalog.B}</p>
          <p className="admin-kpi-label">APIs especificadas</p>
        </div>
        <div className="admin-kpi-card admin-kpi-card--accent-green">
          <div className="admin-kpi-card-top">
            <span className="admin-kpi-icon">
              <PrimeIcon name="pi-check-circle" size={18} />
            </span>
          </div>
          <p className="admin-kpi-value">{catalog.A}</p>
          <p className="admin-kpi-label">Funcionales ahora</p>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-card-top">
            <span className="admin-kpi-icon">
              <PrimeIcon name="pi-percentage" size={18} />
            </span>
          </div>
          <p className="admin-kpi-value">
            {catalog.X_percent != null ? `${catalog.X_percent}%` : "—"}
          </p>
          <p className="admin-kpi-label">CIn-3-S (A/B)</p>
          <p className="admin-kpi-sublabel">{catalog.metric}</p>
        </div>
        {protocols ? (
          <div className="admin-kpi-card">
            <div className="admin-kpi-card-top">
              <span className="admin-kpi-icon">
                <PrimeIcon name="pi-globe" size={18} />
              </span>
            </div>
            <p className="admin-kpi-value">
              {protocols.A}/{protocols.B}
            </p>
            <p className="admin-kpi-label">Protocolos soportados</p>
            <p className="admin-kpi-sublabel">
              {protocols.X_percent != null ? `${protocols.X_percent}% CIn-2-G` : "CIn-2-G"}
            </p>
          </div>
        ) : null}
      </div>

      {catalog.scope_note ? (
        <p className="admin-apis-note muted">{catalog.scope_note}</p>
      ) : null}

      <div className="admin-toolbar admin-apis-filters">
        {(
          [
            ["all", "Todas"],
            ["ok", "Funcionales"],
            ["down", "Sin configurar"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
          <PrimeIcon name="pi-refresh" size={14} /> Actualizar
        </button>
      </div>

      <div className="admin-apis-grid">
        {list.map((item) => (
          <ApiInterfaceCard key={item.id} item={item} />
        ))}
      </div>

      {list.length === 0 ? (
        <p className="muted">Ninguna API con este filtro.</p>
      ) : null}

      {protocols && protocols.protocols.length > 0 ? (
        <section className="admin-apis-protocols">
          <h2 className="admin-card-title">Protocolos de intercambio</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Protocolo</th>
                  <th>Uso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {protocols.protocols.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.id}</code>
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {p.standard}
                      </div>
                    </td>
                    <td>{p.usage}</td>
                    <td>
                      <span
                        className={`admin-api-status${p.supported ? " is-ok" : " is-down"}`}
                      >
                        {p.supported ? "Soportado" : "No activo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ApiInterfaceCard({ item }: { item: SistemaInterface }) {
  return (
    <article className={`admin-api-card${item.functional ? " is-ok" : " is-down"}`}>
      <header className="admin-api-card-head">
        <div>
          <p className="admin-api-card-id">{item.id}</p>
          <h3 className="admin-api-card-title">{item.name}</h3>
          <p className="admin-api-card-system">{item.external_system}</p>
        </div>
        <span className={`admin-api-status${item.functional ? " is-ok" : " is-down"}`}>
          {item.functional ? "Funcional" : "Sin configurar"}
        </span>
      </header>
      <p className="admin-api-card-usage">{item.usage}</p>
      <p className="admin-api-card-verify muted">
        <PrimeIcon name="pi-info-circle" size={13} /> {item.verification}
      </p>
      {item.reference_endpoints?.length ? (
        <ul className="admin-api-endpoints">
          {item.reference_endpoints.map((ep) => (
            <li key={ep}>
              <code>{ep}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ClientesIntegracionPanel() {
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [filter, setFilter] = useState<IntegrationClientStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await fetchAdminIntegrationClients(filter));
    } catch (err) {
      showAdminToast(
        err instanceof ApiError ? err.message : "No se pudo cargar",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const decide = async (id: number, aprobado: boolean) => {
    setBusyId(id);
    try {
      const res = await decideIntegrationClient(id, {
        aprobado,
        motivo: aprobado ? undefined : motivo,
      });
      showAdminToast(res.detail, "success");
      setRejectId(null);
      setMotivo("");
      await reload();
    } catch (err) {
      showAdminToast(err instanceof ApiError ? err.message : "Error al decidir", "error");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (id: number) => {
    if (!window.confirm("¿Revocar este cliente? Su API Key dejará de funcionar.")) return;
    setBusyId(id);
    try {
      const res = await revokeIntegrationClient(id);
      showAdminToast(res.detail, "success");
      await reload();
    } catch (err) {
      showAdminToast(err instanceof ApiError ? err.message : "Error al revocar", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Monitorea clientes de API, usos y revoca accesos. Los desarrolladores activan su acceso
        solos desde el perfil o el registro; aquí puedes fiscalizar y revocar.
      </p>

      <div className="admin-toolbar admin-apis-filters">
        {(
          [
            ["", "Todos"],
            ["pendiente", "Pendientes"],
            ["activo", "Activos"],
            ["revocado", "Revocados"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : clients.length === 0 ? (
        <p className="muted">No hay clientes con este filtro.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Key</th>
                <th>Usos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.organization ? (
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {c.organization}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {c.contact_email}
                    {c.owner_email ? (
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        Usuario: {c.owner_email}
                      </div>
                    ) : null}
                  </td>
                  <td>{c.status_display}</td>
                  <td>
                    {c.key_prefix ? (
                      <code>{c.key_prefix}…</code>
                    ) : (
                      <span className="muted">Sin emitir</span>
                    )}
                  </td>
                  <td>
                    {c.request_count}
                    {c.last_used_at ? (
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {new Date(c.last_used_at).toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {c.status === "pendiente" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => void decide(c.id, true)}
                          >
                            <PrimeIcon name="pi-check" size={14} /> Aprobar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => {
                              setRejectId(c.id);
                              setMotivo("");
                            }}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {c.status === "activo" && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === c.id}
                          onClick={() => void revoke(c.id)}
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                    {rejectId === c.id && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <textarea
                          rows={2}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Motivo del rechazo"
                          style={{ width: "100%", marginBottom: "0.35rem" }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!motivo.trim() || busyId === c.id}
                          onClick={() => void decide(c.id, false)}
                        >
                          Confirmar rechazo
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
