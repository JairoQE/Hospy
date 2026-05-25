import { Link } from "react-router-dom";
import type { PublicUserProfile, User } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { UserAvatar } from "../UserAvatar";

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
};

function formatCount(n: number): string {
  return n.toLocaleString("es-PE");
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
}: Props) {
  const bio = "bio" in user ? user.bio?.trim() : "";
  const roleCategory =
    "role_category" in user && user.role_category
      ? user.role_category
      : null;

  return (
    <div className="profile-hero">
      <section
        className={`profile-cover${coverUrl ? " profile-cover--has-image" : ""}`}
        aria-label="Foto de portada"
      >
        {coverUrl ? (
          <img className="profile-cover-img" src={coverUrl} alt="" />
        ) : (
          <div className="profile-cover-pattern" aria-hidden />
        )}
        <div className="profile-cover-shade" aria-hidden />
      </section>

      <div className="profile-identity-shell">
        <div className="container">
          <div className="profile-identity-card">
            <div className="profile-identity-top">
              <div className="profile-avatar-wrap">
                <UserAvatar user={user} size="xl" className="profile-avatar" />
                {isOwn && onPhotoSelect && (
                  <label className="profile-avatar-edit" title="Cambiar foto">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPhotoSelect(f);
                        e.target.value = "";
                      }}
                    />
                    <PrimeIcon name="pi-camera" size={14} />
                  </label>
                )}
              </div>

              <div className="profile-identity-col">
                <div className="profile-identity-row">
                  <div className="profile-identity-main">
                    <h1 className="profile-name">{title}</h1>
                    <div className="profile-stats-row" aria-label="Seguidores">
                      <span className="profile-stat-chip">
                        <strong>{formatCount(followersCount)}</strong>
                        {followersCount === 1 ? " seguidor" : " seguidores"}
                      </span>
                      {isOwn && followingCount > 0 && (
                        <span className="profile-stat-chip">
                          <strong>{formatCount(followingCount)}</strong> siguiendo
                        </span>
                      )}
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
                        <label className="profile-cover-btn">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={uploadingCover}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f && onCoverSelect) onCoverSelect(f);
                              e.target.value = "";
                            }}
                          />
                          <PrimeIcon name="pi-camera" size={15} />
                          {uploadingCover
                            ? "Subiendo…"
                            : coverUrl
                              ? "Editar portada"
                              : "Añadir portada"}
                        </label>
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
    </div>
  );
}
