import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { PublicUserProfile, User } from "../api/types";
import { ProfileHero } from "../components/profile/ProfileHero";
import { FollowListModal, type FollowListTab } from "../components/profile/FollowListModal";
import { PublicProfileSection } from "../components/profile/PublicProfileSection";
import { PhoneInput, formatPhoneDisplay } from "../components/profile/PhoneInput";
import { ProfileSecuritySection } from "../components/profile/ProfileSecuritySection";
import { OwnerPayoutSection } from "../components/profile/OwnerPayoutSection";
import { BecomeOwnerSection } from "../components/profile/BecomeOwnerSection";
import { IdentityVerificationSection } from "../components/profile/IdentityVerificationSection";
import { VerifyIdentityPromoBanner } from "../components/profile/VerifyIdentityPromoBanner";
import { IntegrationApiSection } from "../components/profile/IntegrationApiSection";
import { useAuth } from "../context/AuthContext";
import { formatDate, profileHeading, rolesLabel } from "../utils/format";
import { hasCapability } from "../utils/roles";
import { formatLastAccessRelative } from "../utils/relativeTime";
import { resolveMediaUrl } from "../utils/media";
import { SkeletonProfilePage } from "../components/ui/Skeleton";

export function ProfilePage() {
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: me, refreshUser, isRole } = useAuth();

  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    bio: "",
  });
  const [msg, setMsg] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<FollowListTab>("followers");

  const targetId = userIdParam ? Number(userIdParam) : me?.id;
  const isOwn = !userIdParam || (me && targetId === me.id);

  const loadPublic = useCallback(async (id: number) => {
    setLoadingPublic(true);
    setError("");
    try {
      const data = await api.get<PublicUserProfile>(`/auth/usuarios/${id}/`, false);
      if (data.is_self) {
        navigate("/perfil", { replace: true });
        return;
      }
      if (data.role === "propietario") {
        navigate(`/anfitrion/${id}`, { replace: true });
        return;
      }
      setPublicProfile(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el perfil");
      setPublicProfile(null);
    } finally {
      setLoadingPublic(false);
    }
  }, [me, navigate]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!isOwn && targetId && !Number.isNaN(targetId)) {
      void loadPublic(targetId);
    } else {
      setPublicProfile(null);
    }
  }, [isOwn, targetId, loadPublic]);

  useEffect(() => {
    if (!me || !isOwn) return;
    setForm({
      first_name: me.first_name ?? "",
      last_name: me.last_name ?? "",
      phone: me.phone ?? "",
      bio: me.bio ?? "",
    });
  }, [me, isOwn]);

  const displayUser = isOwn ? me : publicProfile;
  if (!displayUser && !loadingPublic) {
    if (!isOwn) return <div className="container page"><p className="error-msg">{error || "Perfil no encontrado."}</p></div>;
    return null;
  }
  if (!displayUser) {
    return <SkeletonProfilePage />;
  }

  const { title, showEmail } = profileHeading(
    isOwn
      ? me!
      : {
          first_name: publicProfile!.first_name,
          last_name: publicProfile!.last_name,
          username: publicProfile!.username,
          email: "",
        },
  );

  const coverUrl =
    resolveMediaUrl(
      isOwn
        ? me?.cover_photo_url ?? me?.cover_photo ?? null
        : publicProfile?.cover_photo_url ?? null,
    ) ?? null;

  const followersCount = isOwn
    ? me?.followers_count ?? 0
    : publicProfile?.followers_count ?? 0;
  const followingCount = isOwn ? me?.following_count ?? 0 : publicProfile?.following_count ?? 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwn) return;
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
    setPhotoMsg("");
    setError("");
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      await api.patch<User>("/auth/perfil/", body);
      await refreshUser();
      setPhotoMsg("Foto actualizada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadCover = async (file: File) => {
    setPhotoMsg("");
    setError("");
    setUploadingCover(true);
    try {
      const body = new FormData();
      body.append("cover_photo", file);
      await api.patch<User>("/auth/perfil/", body);
      await refreshUser();
      setPhotoMsg("Portada actualizada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al subir la portada");
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCover = async () => {
    if (!window.confirm("¿Quitar la foto de portada?")) return;
    setPhotoMsg("");
    setUploadingCover(true);
    try {
      await api.patch<User>("/auth/perfil/", { cover_photo: null });
      await refreshUser();
      setPhotoMsg("Portada eliminada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar la portada");
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleFollow = async () => {
    if (!publicProfile || !me) return;
    setFollowLoading(true);
    try {
      const res = await api.post<{
        following: boolean;
        followers_count: number;
      }>(`/auth/usuarios/${publicProfile.id}/seguir/`);
      setPublicProfile({
        ...publicProfile,
        is_following: res.following,
        followers_count: res.followers_count,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al seguir");
    } finally {
      setFollowLoading(false);
    }
  };

  const panelLink = isRole("administrador")
    ? "/admin"
    : isRole("propietario")
      ? "/panel"
      : isRole("patrocinador")
        ? "/patrocinio"
        : "/mis-reservas";
  const panelLabel = isRole("administrador")
    ? "Panel de moderación"
    : isRole("propietario")
      ? "Mi panel de hospedajes"
      : isRole("patrocinador")
        ? "Mis anuncios"
        : "Mis reservas";

  const heroUser = isOwn ? me! : publicProfile!;

  const openFollowList = (tab: FollowListTab) => {
    setFollowListTab(tab);
    setFollowListOpen(true);
  };

  return (
    <div className="profile-page">
      <ProfileHero
        user={heroUser}
        title={title}
        coverUrl={coverUrl}
        isOwn={Boolean(isOwn)}
        showEmail={Boolean(isOwn && showEmail)}
        email={isOwn ? me?.email : undefined}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollowing={publicProfile?.is_following}
        followLoading={followLoading}
        canFollow={!isOwn && !!me}
        onFollowToggle={!isOwn && me ? toggleFollow : undefined}
        onFollowStatsClick={openFollowList}
        uploadingCover={uploadingCover}
        uploadingPhoto={uploadingPhoto}
        onCoverSelect={isOwn ? uploadCover : undefined}
        onCoverRemove={isOwn && coverUrl ? removeCover : undefined}
        onPhotoSelect={isOwn ? uploadPhoto : undefined}
        flash={photoMsg || (isOwn ? "" : error)}
        flashError={!!error && !photoMsg}
      />

      <div className="container profile-content">
        {isOwn && me && !me.is_identity_verified && (
          <VerifyIdentityPromoBanner variant="full" className="profile-verify-promo" />
        )}
        {isOwn ? (
          <div className="profile-grid">
            <aside className="profile-aside">
              <section className="card profile-info-card">
                <h2>Información de la cuenta</h2>
                <dl className="profile-dl">
                  <div>
                    <dt>Correo</dt>
                    <dd>{me?.email}</dd>
                  </div>
                  <div>
                    <dt>Usuario</dt>
                    <dd>{me?.username || "—"}</dd>
                  </div>
                  <div>
                    <dt>Roles en Hospy</dt>
                    <dd className="profile-roles">
                      {rolesLabel(me?.roles, me?.role ?? "huesped")}
                    </dd>
                  </div>
                  <div>
                    <dt>Miembro desde</dt>
                    <dd>{formatDate(me?.date_joined ?? "")}</dd>
                  </div>
                  <div>
                    <dt>Último acceso</dt>
                    <dd>{formatLastAccessRelative(me?.last_login ?? null)}</dd>
                  </div>
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{formatPhoneDisplay(me?.phone)}</dd>
                  </div>
                </dl>
              </section>

              <section className="card profile-quick-card">
                <h2>Accesos rápidos</h2>
                <Link to={panelLink} className="profile-quick-link">
                  {panelLabel}
                </Link>
                {!isRole("huesped") && (
                  <Link to="/mis-reservas" className="profile-quick-link">
                    Mis reservas
                  </Link>
                )}
                <Link to="/bandeja?canal=notificacion" className="profile-quick-link">
                  Notificaciones
                </Link>
                <Link to="/bandeja?canal=mensaje" className="profile-quick-link">
                  Mensajes
                </Link>
                {hasCapability(me, "desarrollador") && (
                  <Link to="/desarrolladores" className="profile-quick-link">
                    Guía de desarrolladores
                  </Link>
                )}
                {me?.role === "propietario" && (
                  <Link to={`/anfitrion/${me.id}`} className="profile-quick-link">
                    Ver mi perfil de propietario
                  </Link>
                )}
              </section>
            </aside>

            <div className="profile-main-stack">
              <IdentityVerificationSection user={me!} onUpdated={refreshUser} />

              <BecomeOwnerSection user={me!} onUpdated={refreshUser} />

              {me && (
                <IntegrationApiSection user={me} onUpdated={refreshUser} />
              )}

              <section className="card profile-form-card">
                <h2>Editar perfil</h2>
                <p className="muted profile-form-hint">
                  Personaliza cómo te ven otros usuarios en Hospy.
                </p>
                <form className="profile-form" onSubmit={save}>
                  <label>
                    Biografía (visible en tu perfil público)
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Cuéntanos sobre ti o tu negocio…"
                    />
                  </label>
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
                  <div className="profile-phone-field">
                    <label htmlFor="profile-phone">Teléfono</label>
                    <PhoneInput
                      id="profile-phone"
                      value={form.phone}
                      onChange={(phone) => setForm({ ...form, phone })}
                    />
                  </div>
                  {msg && <p className="success-msg">{msg}</p>}
                  {error && <p className="error-msg">{error}</p>}
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </form>
              </section>

              {me?.role === "propietario" && me.owner_status === "aprobado" && (
                <OwnerPayoutSection user={me} phone={form.phone} onUpdated={refreshUser} />
              )}

              <ProfileSecuritySection user={me!} onUpdated={refreshUser} />
            </div>
          </div>
        ) : (
          publicProfile && (
            <PublicProfileSection profile={publicProfile} isLoggedIn={!!me} />
          )
        )}
      </div>

      {targetId && !Number.isNaN(targetId) && (
        <FollowListModal
          open={followListOpen}
          onClose={() => setFollowListOpen(false)}
          userId={targetId}
          userName={title}
          followersCount={followersCount}
          followingCount={followingCount}
          initialTab={followListTab}
        />
      )}
    </div>
  );
}
