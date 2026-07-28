import { useCallback, useEffect, useState } from "react";
import {
  decideIntegrationClient,
  fetchAdminIntegrationClients,
  revokeIntegrationClient,
  type IntegrationClient,
  type IntegrationClientStatus,
} from "../api/integrationClients";
import {
  fetchSistemaInterfaces,
} from "../api/sistemaInteroperability";
import { ApiError } from "../api/client";
import { showAdminToast } from "../components/admin/AdminUsersToast";
import { PrimeIcon } from "../components/PrimeIcon";
import { Link } from "react-router-dom";

type Tab = "flujo" | "clientes";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1";

/** Cómo Hospy expone datos a otros sistemas (API saliente). */
const HOSPY_OUTBOUND = {
  id: "IF-02",
  title: "API de integración Hospy",
  subtitle: "Otros sistemas → leen hospedajes de Hospy",
  partner: "SIST / partners externos",
  auth: "Header X-Hospy-Integration-Key",
  how: [
    "El partner solicita una API Key (registro o perfil → Developers).",
    "Un admin aprueba el cliente en la pestaña «Clientes de API».",
    "El partner llama a /api/v1/integracion/hospedajes/ con su key.",
  ],
  endpoints: [
    {
      method: "GET",
      path: "/integracion/hospedajes/",
      desc: "Listado de hospedajes publicados",
    },
    {
      method: "GET",
      path: "/integracion/hospedajes/disponibles/",
      desc: "Disponibles por fechas (?entrada=&salida=)",
    },
    {
      method: "GET",
      path: "/integracion/hospedajes/cercanos/",
      desc: "Cercanos por geo (?lat=&lng=&radio_km=)",
    },
    {
      method: "GET",
      path: "/integracion/hospedajes/{id}/",
      desc: "Detalle de un hospedaje",
    },
  ],
  docs: "/desarrolladores",
};

/** Cómo Hospy consume las 3 APIs partner (entrada / proxy). */
const PARTNER_INBOUND = [
  {
    id: "IF-10",
    name: "Actify",
    domain: "Eventos",
    icon: "pi-calendar",
    direction: "Hospy → Actify",
    auth: "Bearer ACTIFY_API_KEY",
    upstream: "https://actify.qd.je/api/v1",
    how: [
      "Hospy guarda ACTIFY_API_KEY en Cloud Run.",
      "El backend (integrations/actify.py) consulta el catálogo Actify.",
      "El front y otros clientes usan el proxy Hospy /api/v1/eventos/ (sin exponer la key).",
    ],
    proxyEndpoints: [
      { method: "GET", path: "/eventos/", desc: "Listado de eventos" },
      { method: "GET", path: "/eventos/{id}/", desc: "Detalle + aforo" },
    ],
    usedIn: "Búsquedas destacadas, mapa cercano, ofertas por evento",
  },
  {
    id: "IF-11",
    name: "Conecta Tingo",
    domain: "Lugares turísticos",
    icon: "pi-map-marker",
    direction: "Hospy → Conecta Tingo",
    auth: "Query api_key = CONECTA_TINGO_API_KEY",
    upstream: "https://conectatingo.com/api/integracion",
    how: [
      "Hospy guarda CONECTA_TINGO_API_KEY en Cloud Run.",
      "El backend (integrations/conecta_tingo.py) pide hotspots / demanda.",
      "Se expone al front vía proxy /api/v1/lugares-turisticos/.",
    ],
    proxyEndpoints: [
      {
        method: "GET",
        path: "/lugares-turisticos/",
        desc: "Hotspots y lugares",
      },
      {
        method: "GET",
        path: "/lugares-turisticos/{slug}/",
        desc: "Detalle de un lugar",
      },
    ],
    usedIn: "Explorar cerca, destacados de lugares, mapa del local",
  },
  {
    id: "IF-12",
    name: "RestoPoint",
    domain: "Restaurantes",
    icon: "pi-shop",
    direction: "Hospy → RestoPoint",
    auth: "Header X-API-Key = RESTOPOINT_API_KEY",
    upstream: "API RestoPoint (Cloud Run)",
    how: [
      "Hospy guarda RESTOPOINT_API_KEY en Cloud Run.",
      "El backend (integrations/restopoint.py) lista restaurantes con lat/lng.",
      "El front consume el proxy /api/v1/restaurantes/.",
    ],
    proxyEndpoints: [
      { method: "GET", path: "/restaurantes/", desc: "Catálogo de restaurantes" },
      {
        method: "GET",
        path: "/restaurantes/{id}/",
        desc: "Detalle de un restaurante",
      },
    ],
    usedIn: "Destacados, cerca del hospedaje, hero de contexto",
  },
] as const;

export function AdminIntegrationsPage() {
  const [tab, setTab] = useState<Tab>("flujo");

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Integración</h1>
          <p className="muted">
            Cómo Hospy <strong>expone</strong> hospedajes a otros sistemas y cómo{" "}
            <strong>consume</strong> eventos (Actify), lugares (Conecta Tingo) y restaurantes
            (RestoPoint).
          </p>
        </div>
      </header>

      <div className="admin-integ-tabs" role="tablist" aria-label="Secciones de integración">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "flujo"}
          className={`admin-integ-tab${tab === "flujo" ? " is-active" : ""}`}
          onClick={() => setTab("flujo")}
        >
          <PrimeIcon name="pi-arrows-h" size={16} />
          Flujo de APIs
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

      {tab === "flujo" ? <FlujoApisPanel /> : <ClientesIntegracionPanel />}
    </div>
  );
}

function FlujoApisPanel() {
  const [statusById, setStatusById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await fetchSistemaInterfaces();
      const map: Record<string, boolean> = {};
      for (const row of catalog.interfaces ?? []) {
        map[row.id] = Boolean(row.functional);
      }
      setStatusById(map);
    } catch (err) {
      showAdminToast(
        err instanceof ApiError ? err.message : "No se pudo verificar el estado",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const statusOf = (id: string) => statusById[id];

  return (
    <div className="admin-apis-panel">
      <div className="admin-flujo-legend">
        <span className="admin-flujo-chip admin-flujo-chip--out">
          <PrimeIcon name="pi-upload" size={13} /> Hospy expone datos
        </span>
        <span className="admin-flujo-chip admin-flujo-chip--in">
          <PrimeIcon name="pi-download" size={13} /> Hospy consume datos
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
          <PrimeIcon name="pi-refresh" size={14} /> {loading ? "Verificando…" : "Actualizar estado"}
        </button>
      </div>

      <section className="admin-flujo-section">
        <header className="admin-flujo-section-head">
          <h2>1. API que Hospy expone</h2>
          <p className="muted">
            Otros sistemas (SIST u otros partners) leen el inventario de hospedajes con una API Key
            propia. Guía pública:{" "}
            <Link to={HOSPY_OUTBOUND.docs}>/desarrolladores</Link>
          </p>
        </header>

        <article className="admin-flujo-card admin-flujo-card--out">
          <div className="admin-flujo-card-top">
            <div>
              <p className="admin-api-card-id">{HOSPY_OUTBOUND.id}</p>
              <h3>{HOSPY_OUTBOUND.title}</h3>
              <p className="admin-flujo-dir">{HOSPY_OUTBOUND.subtitle}</p>
            </div>
            <StatusPill ok={statusOf(HOSPY_OUTBOUND.id)} loading={loading} />
          </div>

          <dl className="admin-flujo-meta">
            <div>
              <dt>Quién consume</dt>
              <dd>{HOSPY_OUTBOUND.partner}</dd>
            </div>
            <div>
              <dt>Autenticación</dt>
              <dd>
                <code>{HOSPY_OUTBOUND.auth}</code>
              </dd>
            </div>
            <div>
              <dt>Base URL</dt>
              <dd>
                <code>{API_BASE}</code>
              </dd>
            </div>
          </dl>

          <h4 className="admin-flujo-subtitle">Cómo funciona</h4>
          <ol className="admin-flujo-steps">
            {HOSPY_OUTBOUND.how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h4 className="admin-flujo-subtitle">Endpoints expuestos</h4>
          <EndpointList base={API_BASE} items={HOSPY_OUTBOUND.endpoints} />
        </article>
      </section>

      <section className="admin-flujo-section">
        <header className="admin-flujo-section-head">
          <h2>2. APIs que Hospy consume</h2>
          <p className="muted">
            Las 3 integraciones partner: Hospy guarda la API Key del tercero, consulta su API desde
            el backend y reexpone un proxy en <code>/api/v1/</code> para el front (sin filtrar las
            keys).
          </p>
        </header>

        <div className="admin-flujo-partners">
          {PARTNER_INBOUND.map((partner) => (
            <article key={partner.id} className="admin-flujo-card admin-flujo-card--in">
              <div className="admin-flujo-card-top">
                <div className="admin-flujo-partner-title">
                  <span className="admin-flujo-partner-icon" aria-hidden>
                    <PrimeIcon name={partner.icon} size={18} />
                  </span>
                  <div>
                    <p className="admin-api-card-id">
                      {partner.id} · {partner.domain}
                    </p>
                    <h3>{partner.name}</h3>
                    <p className="admin-flujo-dir">{partner.direction}</p>
                  </div>
                </div>
                <StatusPill ok={statusOf(partner.id)} loading={loading} />
              </div>

              <dl className="admin-flujo-meta">
                <div>
                  <dt>Auth hacia el partner</dt>
                  <dd>
                    <code>{partner.auth}</code>
                  </dd>
                </div>
                <div>
                  <dt>Upstream</dt>
                  <dd>
                    <code>{partner.upstream}</code>
                  </dd>
                </div>
                <div>
                  <dt>Uso en Hospy</dt>
                  <dd>{partner.usedIn}</dd>
                </div>
              </dl>

              <h4 className="admin-flujo-subtitle">Cómo funciona</h4>
              <ol className="admin-flujo-steps">
                {partner.how.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h4 className="admin-flujo-subtitle">Proxy Hospy (lo que usa el front)</h4>
              <EndpointList base={API_BASE} items={[...partner.proxyEndpoints]} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusPill({
  ok,
  loading,
}: {
  ok: boolean | undefined;
  loading: boolean;
}) {
  if (loading && ok === undefined) {
    return <span className="admin-api-status">…</span>;
  }
  if (ok) {
    return <span className="admin-api-status is-ok">Activa</span>;
  }
  return <span className="admin-api-status is-down">Sin configurar</span>;
}

function EndpointList({
  base,
  items,
}: {
  base: string;
  items: { method: string; path: string; desc: string }[];
}) {
  return (
    <ul className="admin-flujo-endpoints">
      {items.map((ep) => (
        <li key={ep.path}>
          <span className="admin-flujo-method">{ep.method}</span>
          <div className="admin-flujo-endpoint-body">
            <code>
              {base}
              {ep.path}
            </code>
            <span className="muted">{ep.desc}</span>
          </div>
        </li>
      ))}
    </ul>
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
        Clientes que usan la <strong>API saliente</strong> de Hospy (
        <code>X-Hospy-Integration-Key</code>). Aprueba, fiscaliza o revoca accesos.
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
