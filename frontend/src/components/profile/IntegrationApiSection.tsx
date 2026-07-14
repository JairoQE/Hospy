import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyIntegrationClients,
  issueIntegrationApiKey,
  requestIntegrationClient,
  type IntegrationClient,
} from "../../api/integrationClients";
import { ApiError } from "../../api/client";
import type { User } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";

interface Props {
  user: User;
  onUpdated?: () => Promise<void>;
}

export function IntegrationApiSection({ user, onUpdated }: Props) {
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organization: "",
    contact_email: user.email || "",
    notes: "",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await fetchMyIntegrationClients());
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const active = clients.filter((c) => c.status === "activo");
  const revoked = clients.filter((c) => c.status === "revocado");
  const isDeveloper = Boolean(user.is_developer) || active.length > 0;

  const defaultSystemName = () => {
    const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return full ? `App de ${full}` : `Integración ${user.email.split("@")[0] || "Hospy"}`;
  };

  const afterActivate = async (detail: string) => {
    setMsg(detail);
    setShowForm(false);
    await reload();
    await onUpdated?.();
  };

  const activateQuick = async () => {
    setSaving(true);
    setMsg("");
    setError("");
    setRevealedKey(null);
    try {
      const res = await requestIntegrationClient({
        name: defaultSystemName(),
        contact_email: user.email,
        organization: "",
        notes: "Activación desde perfil",
      });
      await afterActivate(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo activar el acceso");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    setRevealedKey(null);
    try {
      const res = await requestIntegrationClient(form);
      setForm((f) => ({ ...f, name: "", organization: "", notes: "" }));
      await afterActivate(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo activar el acceso");
    } finally {
      setSaving(false);
    }
  };

  const issueKey = async (id: number) => {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await issueIntegrationApiKey(id);
      setRevealedKey(res.api_key);
      setMsg(res.detail);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo emitir la API Key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card profile-become-owner-card profile-integration-card" aria-labelledby="integration-api-title">
      <div className="profile-become-owner-head">
        <PrimeIcon name="pi-code" size={22} />
        <h2 id="integration-api-title">
          {isDeveloper ? "Acceso de desarrollador" : "Convertirme en desarrollador"}
        </h2>
      </div>

      {!isDeveloper ? (
        <>
          <p className="muted profile-become-owner-hint">
            Activa el acceso de desarrollador al instante (sin aprobación del administrador) y
            genera tu API Key para integrar el catálogo de Hospy en otro sistema. Puedes
            combinarlo con tu rol actual (huésped, propietario, admin, etc.). Guía:{" "}
            <Link to="/desarrolladores">leer el boletín</Link>.
          </p>
          <ul className="profile-become-owner-steps">
            <li>Activa tu acceso con un clic (o completa los datos del sistema)</li>
            <li>Genera tu API Key y cópiala (solo se muestra una vez)</li>
            <li>
              Consume <code>/api/v1/integracion/hospedajes/</code> con el header{" "}
              <code>X-Hospy-Integration-Key</code>
            </li>
          </ul>

          {msg && <p className="success-msg">{msg}</p>}
          {error && <p className="error-msg">{error}</p>}

          <div className="profile-become-owner-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || loading}
              onClick={() => void activateQuick()}
            >
              {saving ? "Activando…" : "Solicitar acceso de desarrollador"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancelar formulario" : "Completar datos del sistema"}
            </button>
          </div>

          {showForm && (
            <form className="profile-form" onSubmit={submit} style={{ marginTop: "1rem" }}>
              <label>
                Nombre del sistema *
                <input
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. SIST Universidad / Portal turismo"
                />
              </label>
              <label>
                Organización
                <input
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                />
              </label>
              <label>
                Correo de contacto
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Activando…" : "Activar con estos datos"}
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <p className="muted profile-become-owner-hint">
            Tu acceso de desarrollador está <strong>activo</strong>. Genera o rota tu API Key.
            Documentación: <Link to="/desarrolladores">guía de integración</Link>.
          </p>

          {active.map((c) => (
            <div key={c.id} className="profile-integration-client">
              <div>
                <strong>{c.name}</strong>
                {c.organization ? <span className="muted"> · {c.organization}</span> : null}
                <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
                  {c.key_prefix ? `Prefijo: ${c.key_prefix}…` : "Sin clave emitida todavía"}
                  {` · Usos: ${c.request_count}`}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving}
                onClick={() => void issueKey(c.id)}
              >
                {c.has_api_key ? "Rotar API Key" : "Generar API Key"}
              </button>
            </div>
          ))}

          {revealedKey && (
            <div className="profile-integration-key-reveal" role="status">
              <p>
                <strong>Tu API Key</strong> (cópiala ahora; no se mostrará otra vez):
              </p>
              <code className="profile-integration-key-code">{revealedKey}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: "0.5rem" }}
                onClick={() => {
                  void navigator.clipboard?.writeText(revealedKey);
                  setMsg("API Key copiada al portapapeles.");
                }}
              >
                Copiar
              </button>
            </div>
          )}

          {msg && <p className="success-msg">{msg}</p>}
          {error && <p className="error-msg">{error}</p>}

          {revoked.length > 0 && (
            <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.75rem" }}>
              Accesos revocados anteriormente: {revoked.map((c) => c.name).join(", ")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
