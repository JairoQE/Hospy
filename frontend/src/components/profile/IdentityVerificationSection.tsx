import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { lookupIdentityDni, verifyIdentity, type DniPersona } from "../../api/identity";
import type { User } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { VerifiedBadge } from "../VerifiedBadge";
import { formatDate } from "../../utils/format";

interface Props {
  user: User;
  onUpdated: () => Promise<void>;
}

export function IdentityVerificationSection({ user, onUpdated }: Props) {
  const [dni, setDni] = useState(user.identity_document_number || "");
  const [persona, setPersona] = useState<DniPersona | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (user.is_identity_verified) {
    return (
      <section
        className="card profile-become-owner-card profile-identity-card profile-identity-card--verified"
        role="status"
      >
        <div className="profile-become-owner-head">
          <VerifiedBadge size={24} />
          <h2>Identidad verificada</h2>
        </div>
        <p className="muted profile-become-owner-hint">
          Tu cuenta tiene el badge de usuario verificado. Tus reseñas tienen prioridad y
          generas más confianza en Hospy. La verificación es un beneficio, no un requisito.
        </p>
        <dl className="profile-dl">
          {user.identity_full_name ? (
            <div>
              <dt>Nombre (RENIEC)</dt>
              <dd>{user.identity_full_name}</dd>
            </div>
          ) : null}
          {user.identity_document_number ? (
            <div>
              <dt>DNI</dt>
              <dd>{user.identity_document_number}</dd>
            </div>
          ) : null}
          {user.identity_verified_at ? (
            <div>
              <dt>Verificado el</dt>
              <dd>{formatDate(user.identity_verified_at)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    );
  }

  const consultar = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");
    setPersona(null);
    try {
      const res = await lookupIdentityDni(dni.trim());
      setPersona(res.persona);
      setMsg(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo consultar el DNI");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    setLoading(true);
    setMsg("");
    setError("");
    try {
      const res = await verifyIdentity(dni.trim(), true);
      setMsg(res.detail);
      setPersona(null);
      await onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar la identidad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="verificar-identidad"
      className="card profile-become-owner-card profile-identity-card"
      aria-labelledby="identity-verify-title"
    >
      <div className="profile-become-owner-head">
        <PrimeIcon name="pi-id-card" size={22} />
        <h2 id="identity-verify-title">Verificar identidad</h2>
      </div>
      <p className="muted profile-become-owner-hint">
        Opcional. Valida tu DNI con RENIEC (vía Factiliza) y obtén beneficios: badge de
        verificado, reseñas con prioridad y más confianza. No bloquea reservas ni
        publicación.
      </p>
      <ul className="profile-become-owner-steps">
        <li>Ingresa tu DNI de 8 dígitos</li>
        <li>Revisa que los nombres coincidan contigo</li>
        <li>Confirma para activar el badge de verificado</li>
      </ul>

      <form className="profile-form" onSubmit={consultar}>
        <label>
          DNI
          <input
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            required
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="12345678"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading || dni.length !== 8}>
          {loading && !persona ? "Consultando…" : "Consultar DNI"}
        </button>
      </form>

      {persona && (
        <div className="profile-identity-preview" role="status">
          <p>
            <strong>{persona.nombre_completo || `${persona.nombres} ${persona.apellido_paterno}`}</strong>
          </p>
          <p className="muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.9rem" }}>
            DNI {persona.numero}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => void confirmar()}
          >
            {loading ? "Verificando…" : "Confirmar y verificar identidad"}
          </button>
        </div>
      )}

      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}
    </section>
  );
}
