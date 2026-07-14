import { useState } from "react";
import { Link } from "react-router-dom";
import type { PublicUserProfile, User } from "../../api/types";
import { resolveMediaUrl } from "../../utils/media";
import { IconSpinner } from "../icons";
import { PrimeIcon } from "../PrimeIcon";
import { ImageLightbox } from "../ui/ImageLightbox";
import { UserAvatar } from "../UserAvatar";
import { VerifiedBadge } from "../VerifiedBadge";
import { PhotoSourcePicker } from "./PhotoSourcePicker";

type ProfileUser = User | PublicUserProfile;

type Props = {
  user: ProfileUser;
  title: string;
  coverUrl: string | null;
  isOwn: boolean;
  showEmail?: boolean;
  email?: string;
  followersCount: number;
  followingCount?: number;
  isFollowing?: boolean;
  followLoading?: boolean;
  canFollow?: boolean;
  onFollowToggle?: () => void;
  uploadingCover?: boolean;
  uploadingPhoto?: boolean;
  onCoverSelect?: (file: File) => void;
  onCoverRemove?: () => void;
  onPhotoSelect?: (file: File) => void;
  flash?: string;
  flashError?: boolean;
  onFollowStatsClick?: (tab: "followers" | "following") => void;
};

function formatCount(n: number): string {
  return n.toLocaleString("es-PE");
}

function profilePhotoUrl(user: ProfileUser): string | null {
  const raw =
    user.photo_url ??
    ("photo" in user ? user.photo : null);
  return resolveMediaUrl(raw) ?? null;
}

export function ProfileHero({
  user,
  title,
  coverUrl,
  isOwn,
  showEmail,
  email,
  followersCount,
  followingCount = 0,
  isFollowing,
  followLoading,
  canFollow = false,
  onFollowToggle,
  uploadingCover,
  uploadingPhoto,
  onCoverSelect,
  onCoverRemove,
  onPhotoSelect,
  flash,
  flashError,
  onFollowStatsClick,
}: Props) {
  const [lightbox, setLightbox] = useState<"photo" | "cover" | null>(null);
  const photoUrl = profilePhotoUrl(user);
  const bio = "bio" in user ? user.bio?.trim() : "";
  const roleCategory =
    "role_category" in user && user.role_category
      ? user.role_category
      : null;
  const isVerified = Boolean(user.is_identity_verified);

  return (
    <div className="profile-hero">
      <section
        className={`profile-cover${coverUrl ? " profile-cover--has-image" : ""}`}
        aria-label="Foto de portada"
      >
        {coverUrl ? (
          <button
            type="button"
            className="profile-cover-open"
            onClick={() => setLightbox("cover")}
            aria-label="Ver portada ampliada"
          >
            <img className="profile-cover-img" src={coverUrl} alt="" />
          </button>
        ) : (
          <div className="profile-cover-pattern" aria-hidden />
        )}
        <div className="profile-cover-shade" aria-hidden />
      </section>

      <div className="profile-identity-shell">
        <div className="container">
          <div className="profile-identity-card">
            <div className="profile-identity-top">
              <div
                className={`profile-avatar-wrap${uploadingPhoto ? " profile-avatar-wrap--uploading" : ""}${photoUrl ? " profile-avatar-wrap--clickable" : ""}`}
              >
                {photoUrl ? (
                  <button
                    type="button"
                    className="profile-avatar-open"
                    onClick={() => setLightbox("photo")}
                    aria-label="Ver foto de perfil ampliada"
                    disabled={uploadingPhoto}
                  >
                    <UserAvatar user={user} size="xl" className="profile-avatar" />
                  </button>
                ) : (
                  <UserAvatar user={user} size="xl" className="profile-avatar" />
                )}
                {uploadingPhoto && (
                  <div
                    className="profile-avatar-upload-overlay"
                    role="status"
                    aria-live="polite"
                    aria-label="Subiendo foto de perfil"
                  >
                    <IconSpinner size={28} className="profile-avatar-upload-spinner" />
                    <span>Subiendo…</span>
                  </div>
                )}
                {isOwn && onPhotoSelect && (
                  <PhotoSourcePicker
                    triggerClassName="profile-avatar-edit"
                    triggerTitle={uploadingPhoto ? "Subiendo foto…" : "Cambiar foto"}
                    disabled={uploadingPhoto}
                    uploading={uploadingPhoto}
                    cameraFacing="user"
                    menuAlign="left"
                    onSelect={onPhotoSelect}
                    trigger={<PrimeIcon name="pi-camera" size={14} />}
                  />
                )}
              </div>

              <div className="profile-identity-col">
                <div className="profile-identity-row">
                  <div className="profile-identity-main">
                    <h1 className="profile-name">
                      <span className="profile-name-text">{title}</span>
                      {isVerified ? <VerifiedBadge size={22} /> : null}
                    </h1>
                    <div className="profile-stats-row" aria-label="Seguidores">
                      <button
                        type="button"
                        className="profile-stat-chip profile-stat-chip--clickable"
                        onClick={() => onFollowStatsClick?.("followers")}
                        aria-label={`${formatCount(followersCount)} seguidores`}
                      >
                        <strong>{formatCount(followersCount)}</strong>
                        {followersCount === 1 ? " seguidor" : " seguidores"}
                      </button>
                      <button
                        type="button"
                        className="profile-stat-chip profile-stat-chip--clickable"
                        onClick={() => onFollowStatsClick?.("following")}
                        aria-label={`${formatCount(followingCount)} siguiendo`}
                      >
                        <strong>{formatCount(followingCount)}</strong> siguiendo
                      </button>
                    </div>
                    {showEmail && email && <p className="profile-email">{email}</p>}
                    {roleCategory && (
                      <p className="profile-category">
                        <PrimeIcon name="pi-briefcase" size={14} />
                        {roleCategory}
                      </p>
                    )}
                  </div>

                  <div className="profile-identity-actions">
                    {isOwn && (
                      <div className="profile-card-toolbar">
                        {onCoverSelect && (
                          <PhotoSourcePicker
                            triggerClassName="profile-cover-btn"
                            triggerTitle={
                              uploadingCover
                                ? "Subiendo portada…"
                                : coverUrl
                                  ? "Editar portada"
                                  : "Añadir portada"
                            }
                            disabled={uploadingCover}
                            uploading={uploadingCover}
                            cameraFacing="environment"
                            menuAlign="right"
                            onSelect={onCoverSelect}
                            trigger={
                              <>
                                <PrimeIcon name="pi-camera" size={15} />
                                {uploadingCover
                                  ? "Subiendo portada…"
                                  : coverUrl
                                    ? "Editar portada"
                                    : "Añadir portada"}
                              </>
                            }
                          />
                        )}
                        {coverUrl && onCoverRemove && (
                          <button
                            type="button"
                            className="profile-cover-btn profile-cover-btn--muted"
                            disabled={uploadingCover}
                            onClick={onCoverRemove}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    )}

                    {!isOwn && (
                      canFollow && onFollowToggle ? (
                        <button
                          type="button"
                          className={`profile-follow-btn${isFollowing ? " is-following" : ""}`}
                          disabled={followLoading}
                          onClick={onFollowToggle}
                          aria-pressed={isFollowing}
                        >
                          <PrimeIcon
                            name={isFollowing ? "pi-check" : "pi-user-plus"}
                            size={16}
                          />
                          {followLoading ? "…" : isFollowing ? "Siguiendo" : "Seguir"}
                        </button>
                      ) : (
                        <Link
                          to="/login"
                          className="profile-follow-btn profile-follow-btn--login"
                        >
                          <PrimeIcon name="pi-user-plus" size={16} />
                          Seguir
                        </Link>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {bio && (
              <div className="profile-bio-block">
                <p className="profile-bio">{bio}</p>
              </div>
            )}

            {isOwn && (
              <p className="profile-own-hint muted">
                {user.role === "propietario" ? (
                  <>
                    Los huéspedes ven tu{" "}
                    <Link to={`/anfitrion/${user.id}`}>perfil de propietario</Link> con todos tus
                    hospedajes.
                  </>
                ) : (
                  <>
                    El botón <strong>Seguir</strong> lo ven otros usuarios en{" "}
                    <Link to={`/perfil/${user.id}`}>tu perfil público</Link>.
                  </>
                )}
              </p>
            )}

            {flash && (
              <p
                className={`profile-flash${flashError ? " profile-flash--error" : " profile-flash--ok"}`}
                role="status"
              >
                {flash}
              </p>
            )}
          </div>
        </div>
      </div>

      {lightbox === "photo" && photoUrl && (
        <ImageLightbox
          src={photoUrl}
          alt={`Foto de perfil de ${title}`}
          onClose={() => setLightbox(null)}
        />
      )}
      {lightbox === "cover" && coverUrl && (
        <ImageLightbox
          src={coverUrl}
          alt={`Portada de ${title}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
