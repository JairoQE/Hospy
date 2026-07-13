import { useCallback, useEffect, useState, type FormEvent } from "react";
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
}

export function IntegrationApiSection({ user }: Props) {
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
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

  const pending = clients.find((c) => c.status === "pendiente");
  const active = clients.filter((c) => c.status === "activo");
  const revoked = clients.filter((c) => c.status === "revocado");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    setRevealedKey(null);
    try {
      const res = await requestIntegrationClient(form);
      setMsg(res.detail);
      setForm((f) => ({ ...f, name: "", organization: "", notes: "" }));
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
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
    <section className="card profile-integration-card" aria-labelledby="integration-api-title">
      <div className="profile-become-owner-head">
        <PrimeIcon name="pi-key" size={22} />
        <h2 id="integration-api-title">API de integración</h2>
      </div>
      <p className="muted profile-become-owner-hint">
        Solicita acceso para que otro sistema consuma el catálogo de hospedajes de Hospy
        (REST + API Key). Un administrador aprueba la solicitud; luego emites tu clave desde
        aquí.
      </p>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          {pending && (
            <div className="profile-integration-banner profile-integration-banner--pending" role="status">
              <PrimeIcon name="pi-clock" size={18} />
              <div>
                <strong>Solicitud en revisión:</strong> {pending.name}
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  Cuando te aprueben, podrás generar tu API Key aquí.
                </p>
              </div>
            </div>
          )}

          {active.map((c) => (
            <div key={c.id} className="profile-integration-client">
              <div>
                <strong>{c.name}</strong>
                {c.organization ? <span className="muted"> · {c.organization}</span> : null}
                <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
                  Estado: {c.status_display}
                  {c.key_prefix ? ` · Prefijo: ${c.key_prefix}…` : " · Sin clave emitida"}
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

          {revoked.length > 0 && (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Accesos revocados: {revoked.map((c) => c.name).join(", ")}. Puedes solicitar uno nuevo.
            </p>
          )}

          {revealedKey && (
            <div className="profile-integration-key-reveal" role="status">
              <p>
                <strong>Tu API Key</strong> (cópiala ahora; no se mostrará otra vez):
              </p>
              <code className="profile-integration-key-code">{revealedKey}</code>
              <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                Header: <code>X-Hospy-Integration-Key: {revealedKey.slice(0, 12)}…</code>
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(revealedKey);
                  setMsg("API Key copiada al portapapeles.");
                }}
              >
                Copiar
              </button>
            </div>
          )}

          {!pending && (
            <form className="profile-form" onSubmit={submit} style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>
                {active.length || revoked.length
                  ? "Nueva solicitud de acceso"
                  : "Solicitar acceso"}
              </h3>
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
                  placeholder="Empresa o institución"
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
              <label>
                Notas (opcional)
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Para qué usarás la API…"
                />
              </label>
              {msg && <p className="success-msg">{msg}</p>}
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Enviando…" : "Solicitar API de integración"}
              </button>
            </form>
          )}

          {(msg || error) && pending && (
            <>
              {msg && <p className="success-msg">{msg}</p>}
              {error && <p className="error-msg">{error}</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
