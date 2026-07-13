import { useCallback, useEffect, useState } from "react";
import {
  decideIntegrationClient,
  fetchAdminIntegrationClients,
  revokeIntegrationClient,
  type IntegrationClient,
  type IntegrationClientStatus,
} from "../api/integrationClients";
import { ApiError } from "../api/client";
import { showAdminToast } from "../components/admin/AdminUsersToast";
import { PrimeIcon } from "../components/PrimeIcon";

export function AdminIntegrationsPage() {
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
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Clientes de integración</h1>
          <p className="muted">
            Monitorea clientes de API, usos y revoca accesos. Los desarrolladores activan su acceso
            solos desde el perfil o el registro; aquí puedes fiscalizar y revocar.
          </p>
        </div>
      </header>

      <div
        className="admin-toolbar"
        style={{ marginBottom: "1rem", gap: "0.5rem", display: "flex", flexWrap: "wrap" }}
      >
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
    </div>
  );
}
