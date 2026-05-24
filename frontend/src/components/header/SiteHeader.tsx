import { useCallback, useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { HospyBrand } from "../brand/HospyBrand";
import { IconClose, IconMenu } from "../icons";
import { InboxHeaderButtons } from "../InboxHeaderButtons";
import { HeaderUserMenu } from "./HeaderUserMenu";

const NAV_PUBLIC = [
  { to: "/", label: "Explorar", end: true },
  { to: { pathname: "/", hash: "destinos" }, label: "Destinos", end: false },
  { to: { pathname: "/", search: "?ofertas=1" }, label: "Ofertas", end: false },
] as const;

function navClassName({ isActive }: { isActive: boolean }) {
  return `header-nav-link${isActive ? " is-active" : ""}`;
}

export function SiteHeader() {
  const { user, logout, isRole } = useAuth();
  const location = useLocation();
  const menuId = useId();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const roleNav = useCallback(() => {
    if (!user) return null;
    if (isRole("huesped")) {
      return (
        <NavLink to="/mis-reservas" className={navClassName} onClick={() => setMobileOpen(false)}>
          Mis reservas
        </NavLink>
      );
    }
    if (isRole("propietario")) {
      return (
        <NavLink to="/panel" className={navClassName} onClick={() => setMobileOpen(false)}>
          Mi panel
        </NavLink>
      );
    }
    if (isRole("administrador")) {
      return (
        <>
          <NavLink to="/admin" className={navClassName} onClick={() => setMobileOpen(false)}>
            Panel
          </NavLink>
          <NavLink
            to="/admin/inicio"
            className={navClassName}
            onClick={() => setMobileOpen(false)}
          >
            Inicio
          </NavLink>
        </>
      );
    }
    return null;
  }, [user, isRole]);

  return (
    <header
      className={`site-header site-header--v2${scrolled ? " is-scrolled" : ""}`}
    >
      <div className="header-container">
        <div className="header-grid">
          <HospyBrand />

          <nav className="header-nav-desktop" aria-label="Navegación principal">
            {NAV_PUBLIC.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={navClassName}
              >
                {item.label}
              </NavLink>
            ))}
            {roleNav()}
          </nav>

          <div className="header-end">
            {user && (
              <div className="header-inbox-wrap">
                <InboxHeaderButtons />
              </div>
            )}

            {user ? (
              <HeaderUserMenu
                user={user}
                onLogout={logout}
                className="header-user-menu--desktop"
              />
            ) : (
              <div className="header-auth-desktop">
                <Link to="/login" className="header-link-auth">
                  Entrar
                </Link>
                <Link to="/registro" className="btn btn-header-register">
                  Registrarse
                </Link>
              </div>
            )}

            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls={menuId}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <IconClose size={24} /> : <IconMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="header-mobile-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id={menuId}
            className="header-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <nav className="header-mobile-nav" aria-label="Navegación móvil">
              {NAV_PUBLIC.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={navClassName}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {roleNav()}
            </nav>

            {user ? (
              <div className="header-mobile-user">
                <Link
                  to="/perfil"
                  className="header-mobile-menu-item"
                  onClick={() => setMobileOpen(false)}
                >
                  Mi perfil
                </Link>
                {isRole("huesped") && (
                  <Link
                    to="/mis-reservas"
                    className="header-mobile-menu-item"
                    onClick={() => setMobileOpen(false)}
                  >
                    Mis reservas
                  </Link>
                )}
                {isRole("propietario") && (
                  <Link
                    to="/panel"
                    className="header-mobile-menu-item"
                    onClick={() => setMobileOpen(false)}
                  >
                    Mi panel
                  </Link>
                )}
                <button
                  type="button"
                  className="header-mobile-menu-item header-mobile-menu-item--danger"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="header-mobile-auth">
                <Link
                  to="/login"
                  className="header-mobile-btn header-mobile-btn--ghost"
                  onClick={() => setMobileOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  to="/registro"
                  className="header-mobile-btn header-mobile-btn--primary"
                  onClick={() => setMobileOpen(false)}
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
