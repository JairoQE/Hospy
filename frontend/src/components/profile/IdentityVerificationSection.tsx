import { useEffect, useRef, useState } from "react";
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
  const [dni, setDni] = useState("");
  const [persona, setPersona] = useState<DniPersona | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const lookupSeq = useRef(0);

  useEffect(() => {
    setMsg("");
    setError("");

    if (dni.length !== 8) {
      setPersona(null);
      setPanelOpen(false);
      setLoadingLookup(false);
      return;
    }

    const seq = ++lookupSeq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingLookup(true);
        setError("");
        try {
          const res = await lookupIdentityDni(dni);
          if (lookupSeq.current !== seq) return;
          setPersona(res.persona);
          setPanelOpen(true);
        } catch (err) {
          if (lookupSeq.current !== seq) return;
          setPersona(null);
          setPanelOpen(false);
          setError(err instanceof ApiError ? err.message : "No se pudo consultar el DNI");
        } finally {
          if (lookupSeq.current === seq) setLoadingLookup(false);
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [dni]);

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

  const cancelar = () => {
    lookupSeq.current += 1;
    setDni("");
    setPersona(null);
    setPanelOpen(false);
    setLoadingLookup(false);
    setMsg("");
    setError("");
  };

  const confirmar = async () => {
    if (!persona) return;
    setLoadingVerify(true);
    setMsg("");
    setError("");
    try {
      const res = await verifyIdentity(persona.numero, true);
      setMsg(res.detail);
      setPersona(null);
      setPanelOpen(false);
      setDni("");
      await onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar la identidad");
    } finally {
      setLoadingVerify(false);
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
        Opcional. Escribe tu DNI y autocompletamos tus datos desde RENIEC (vía Factiliza).
        Confirma para guardar el nombre real en tu perfil y activar el badge. No bloquea
        reservas ni publicación.
      </p>
      <ul className="profile-become-owner-steps">
        <li>Ingresa tu DNI de 8 dígitos</li>
        <li>Se despliega el formulario con tus datos reales</li>
        <li>Confirma para guardarlos en tu cuenta, o cancela</li>
      </ul>

      <div className="profile-form">
        <label>
          DNI
          <input
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="12345678"
            autoComplete="off"
            disabled={loadingVerify}
            aria-describedby="identity-dni-hint"
          />
        </label>
        <p id="identity-dni-hint" className="muted profile-identity-dni-hint">
          {loadingLookup
            ? "Consultando RENIEC…"
            : dni.length === 8
              ? "Datos listos para revisar abajo."
              : `Escribe los 8 dígitos (${dni.length}/8).`}
        </p>
      </div>

      {panelOpen && persona && (
        <div className="profile-identity-autocomplete" role="region" aria-label="Datos RENIEC">
          <div className="profile-identity-autocomplete-head">
            <PrimeIcon name="pi-check-circle" size={18} />
            <strong>Datos encontrados · revisa y confirma</strong>
          </div>

          <div className="profile-identity-autocomplete-form">
            <label>
              DNI
              <input readOnly value={persona.numero} />
            </label>
            <label>
              Nombres
              <input readOnly value={persona.nombres} />
            </label>
            <label>
              Apellido paterno
              <input readOnly value={persona.apellido_paterno} />
            </label>
            <label>
              Apellido materno
              <input readOnly value={persona.apellido_materno} />
            </label>
            <label className="profile-identity-autocomplete-full">
              Nombre completo
              <input readOnly value={persona.nombre_completo} />
            </label>
          </div>

          <p className="muted profile-identity-autocomplete-note">
            Al confirmar, estos datos se guardan en tu perfil (nombre y apellidos) y se activa
            tu insignia de verificado.
          </p>

          <div className="profile-become-owner-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={loadingVerify}
              onClick={() => void confirmar()}
            >
              {loadingVerify ? "Guardando…" : "Confirmar y verificar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={loadingVerify}
              onClick={cancelar}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}
    </section>
  );
}
