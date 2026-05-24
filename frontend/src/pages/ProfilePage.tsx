import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { User } from "../api/types";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { displayName, formatDate, roleLabel } from "../utils/format";
import { formatLastAccessRelative } from "../utils/relativeTime";

export function ProfilePage() {
  const { user, refreshUser, isRole } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
    });
  }, [user]);

  if (!user) return null;

  const name = displayName(user);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      await api.patch<User>("/auth/perfil/", form);
      await refreshUser();
      setMsg("Perfil actualizado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setMsg("");
    setError("");
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      await api.patch<User>("/auth/perfil/", body);
      await refreshUser();
      setMsg("Foto de perfil actualizada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const panelLink = isRole("administrador")
    ? "/admin"
    : isRole("propietario")
      ? "/panel"
      : "/mis-reservas";
  const panelLabel = isRole("administrador")
    ? "Panel de moderación"
    : isRole("propietario")
      ? "Mi panel de hospedajes"
      : "Mis reservas";

  return (
    <div className="profile-page">
      <div className="profile-cover" aria-hidden />
      <div className="container profile-page-inner">
        <header className="profile-header card">
          <div className="profile-avatar-block">
            <UserAvatar user={user} size="xl" className="profile-avatar" />
            <label className="profile-photo-btn">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhoto(file);
                }}
              />
              {uploadingPhoto ? "Subiendo…" : "Cambiar foto"}
            </label>
          </div>
          <div className="profile-header-text">
            <h1>{name}</h1>
            <p className="profile-email muted">{user.email}</p>
            <div className="profile-badges">
              <span className="profile-role-badge">{roleLabel(user.role)}</span>
              {user.username && (
                <span className="profile-username muted">@{user.username}</span>
              )}
            </div>
          </div>
        </header>

        <div className="profile-grid">
          <aside className="profile-aside">
            <section className="card profile-info-card">
              <h2>Información de la cuenta</h2>
              <dl className="profile-dl">
                <div>
                  <dt>Correo</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Usuario</dt>
                  <dd>{user.username || "—"}</dd>
                </div>
                <div>
                  <dt>Rol en Hospy</dt>
                  <dd>{roleLabel(user.role)}</dd>
                </div>
                <div>
                  <dt>Miembro desde</dt>
                  <dd>{formatDate(user.date_joined)}</dd>
                </div>
                <div>
                  <dt>Último acceso</dt>
                  <dd>{formatLastAccessRelative(user.last_login)}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{user.phone?.trim() || "Sin registrar"}</dd>
                </div>
              </dl>
            </section>

            <section className="card profile-quick-card">
              <h2>Accesos rápidos</h2>
              <Link to={panelLink} className="profile-quick-link">
                {panelLabel}
              </Link>
              <Link to="/bandeja?canal=notificacion" className="profile-quick-link">
                Notificaciones
              </Link>
              <Link to="/bandeja?canal=mensaje" className="profile-quick-link">
                Mensajes
              </Link>
            </section>
          </aside>

          <section className="card profile-form-card">
            <h2>Editar datos personales</h2>
            <p className="muted profile-form-hint">
              Estos datos pueden verse en reservas y mensajes con otros usuarios.
            </p>
            <form className="profile-form" onSubmit={save}>
              <div className="form-row">
                <label>
                  Nombre
                  <input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Apellido
                  <input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label>
                Teléfono
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+51 999 999 999"
                  autoComplete="tel"
                />
              </label>
              {msg && <p className="success-msg">{msg}</p>}
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
