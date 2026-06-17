import { Link } from "react-router-dom";
import type { PublicUserProfile } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";
import { formatDate } from "../../utils/format";

type Props = {
  profile: PublicUserProfile;
  isLoggedIn: boolean;
};

function formatCount(n: number): string {
  return n.toLocaleString("es-PE");
}

export function PublicProfileSection({ profile, isLoggedIn }: Props) {
  const bio = profile.bio?.trim();
  const memberSince = profile.date_joined ? formatDate(profile.date_joined) : "—";

  return (
    <div className="profile-public-layout">
      <section className="card profile-public-bio-card">
        <h2 className="profile-public-heading">
          <PrimeIcon name="pi-user" size={18} />
          Sobre {profile.first_name?.trim() || profile.username}
        </h2>
        {bio ? (
          <p className="profile-public-bio">{bio}</p>
        ) : (
          <p className="profile-public-bio profile-public-bio--empty muted">
            Este usuario aún no ha escrito una biografía.
          </p>
        )}
      </section>

      <aside className="profile-public-aside">
        <section className="card profile-public-stats-card">
          <h2 className="profile-public-heading">
            <PrimeIcon name="pi-chart-bar" size={18} />
            Actividad en Hospy
          </h2>
          <dl className="profile-public-stats">
            <div className="profile-public-stat">
              <dt>Seguidores</dt>
              <dd>{formatCount(profile.followers_count)}</dd>
            </div>
            <div className="profile-public-stat">
              <dt>Siguiendo</dt>
              <dd>{formatCount(profile.following_count)}</dd>
            </div>
            <div className="profile-public-stat">
              <dt>Miembro desde</dt>
              <dd>{memberSince}</dd>
            </div>
            <div className="profile-public-stat">
              <dt>Tipo de cuenta</dt>
              <dd>{profile.role_category || "Huésped en Hospy"}</dd>
            </div>
          </dl>
        </section>

        {!isLoggedIn && (
          <section className="card profile-public-cta-card">
            <PrimeIcon name="pi-users" size={22} className="profile-public-cta-icon" />
            <p>
              <strong>¿Quieres seguir a este usuario?</strong>
            </p>
            <p className="muted profile-public-cta-text">
              Inicia sesión o crea una cuenta para seguir perfiles y ver sus novedades en Hospy.
            </p>
            <div className="profile-public-cta-actions">
              <Link to="/login" className="btn btn-primary">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="btn btn-secondary">
                Registrarse
              </Link>
            </div>
          </section>
        )}

        {isLoggedIn && (
          <section className="card profile-public-cta-card profile-public-cta-card--subtle">
            <p className="muted profile-public-cta-text">
              Usa el botón <strong>Seguir</strong> arriba para añadir a este usuario a tu red en
              Hospy.
            </p>
            <Link to="/perfil" className="profile-quick-link">
              Ver mi perfil
            </Link>
          </section>
        )}
      </aside>
    </div>
  );
}
