import { useState } from "react";
import { Link } from "react-router-dom";
import { requestOwnerRole } from "../../api/account";
import { ApiError } from "../../api/client";
import type { User } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";

interface BecomeOwnerSectionProps {
  user: User;
  onUpdated: () => Promise<void>;
}

export function BecomeOwnerSection({ user, onUpdated }: BecomeOwnerSectionProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const isGuest = user.role === "huesped";
  const isPending = user.role === "propietario" && user.owner_status === "pendiente";
  const isRejected = user.role === "propietario" && user.owner_status === "rechazado";

  if (!isGuest && !isPending && !isRejected) {
    return null;
  }

  const submit = async () => {
    setLoading(true);
    setMsg("");
    setError("");
    try {
      const res = await requestOwnerRole();
      await onUpdated();
      setMsg(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <section className="card profile-become-owner-card profile-become-owner-card--pending" role="status">
        <div className="profile-become-owner-head">
          <PrimeIcon name="pi-clock" size={22} />
          <h2>Solicitud de anfitrión en revisión</h2>
        </div>
        <p className="muted">
          Un administrador está validando tu cuenta. Te avisaremos en la bandeja cuando puedas
          publicar hospedajes.
        </p>
        <Link to="/panel" className="btn btn-ghost btn-sm">
          Ver panel de anfitrión
        </Link>
      </section>
    );
  }

  return (
    <section className="card profile-become-owner-card" aria-labelledby="become-owner-title">
      <div className="profile-become-owner-head">
        <PrimeIcon name="pi-home" size={22} />
        <h2 id="become-owner-title">
          {isRejected ? "Volver a solicitar ser anfitrión" : "Publicar hospedajes en Hospy"}
        </h2>
      </div>

      {isRejected ? (
        <p className="profile-become-owner-rejected muted" role="alert">
          <strong>Solicitud anterior no aprobada.</strong>{" "}
          {user.owner_rejection_reason?.trim() ||
            "Revisa tus datos de perfil y vuelve a enviar la solicitud."}
        </p>
      ) : (
        <p className="muted profile-become-owner-hint">
          ¿Tienes un hospedaje, hostal o departamento? Solicita una cuenta de anfitrión. Un
          administrador revisará tu perfil antes de habilitar la publicación.
        </p>
      )}

      <ul className="profile-become-owner-steps">
        <li>Completa tu nombre y teléfono en el perfil</li>
        <li>Envía la solicitud al equipo Hospy</li>
        <li>Cuando te aprueben, crea tu primer hospedaje desde el panel</li>
      </ul>

      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={loading}
      >
        {loading
          ? "Enviando…"
          : isRejected
            ? "Reenviar solicitud"
            : "Solicitar cuenta de anfitrión"}
      </button>
    </section>
  );
}
