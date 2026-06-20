import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { useTheme } from "../../context/ThemeContext";
import { HospyBrand } from "../brand/HospyBrand";
import { AccessibilityButton } from "../accessibility/AccessibilityButton";
import { IconClose, IconMenu } from "../icons";
import { InboxHeaderButtons } from "../InboxHeaderButtons";
import { HeaderUserMenu } from "./HeaderUserMenu";

function navLinkClass(active: boolean) {
  return `header-nav-link${active ? " is-active" : ""}`;
}

function navClassName({ isActive }: { isActive: boolean }) {
  return navLinkClass(isActive);
}

function isExploreNavActive({ pathname, search, hash }: Location) {
  if (pathname !== "/") return false;
  if (new URLSearchParams(search).get("ofertas") === "1") return false;
  return hash !== "#destinos";
}

function isDestinosNavActive({ pathname, hash }: Location) {
  return pathname === "/" && hash === "#destinos";
}

function isOfertasNavActive({ pathname, search }: Location) {
  return pathname === "/" && new URLSearchParams(search).get("ofertas") === "1";
}

export function SiteHeader() {
  const { user, logout, isRole } = useAuth();
  const { t } = useLocaleCurrency();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const navPublic = [
    {
      to: "/",
      label: t("nav.explore"),
      end: true as const,
      isActive: isExploreNavActive,
    },
    {
      to: { pathname: "/", hash: "#destinos" },
      label: t("nav.destinations"),
      isActive: isDestinosNavActive,
    },
    {
      to: { pathname: "/", search: "?ofertas=1" },
      label: t("nav.offers"),
      isActive: isOfertasNavActive,
    },
  ];
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
          {t("nav.myBookings")}
        </NavLink>
      );
    }
    if (isRole("propietario")) {
      return (
        <NavLink to="/panel" className={navClassName} onClick={() => setMobileOpen(false)}>
          {t("nav.myPanel")}
        </NavLink>
      );
    }
    if (isRole("patrocinador")) {
      return (
        <NavLink
          to="/patrocinio"
          className={({ isActive }) =>
            `header-nav-link header-nav-link--sponsor${isActive ? " is-active" : ""}`
          }
          onClick={() => setMobileOpen(false)}
        >
          {t("nav.myAds")}
        </NavLink>
      );
    }
    if (isRole("administrador")) {
      return (
        <NavLink to="/admin" className={navClassName} onClick={() => setMobileOpen(false)}>
          {t("nav.panel")}
        </NavLink>
      );
    }
    return null;
  }, [user, isRole, t]);

  return (
    <header
      className={`site-header site-header--v2${scrolled ? " is-scrolled" : ""}`}
    >
      <div className="header-container">
        <div className="header-grid">
          <HospyBrand />

          <nav className="header-nav-desktop" aria-label="Navegación principal">
            {navPublic.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={"end" in item ? item.end : undefined}
                className={() => navLinkClass(item.isActive(location))}
              >
                {item.label}
              </NavLink>
            ))}
            {roleNav()}
          </nav>

          <div className="header-end">
            <AccessibilityButton />

            <label className="theme-switch" aria-label="Cambiar tema claro/oscuro">
              <span className="theme-switch-sun" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g fill="#ffd43b">
                    <circle r="5" cy="12" cx="12"></circle>
                    <path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1 -.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1 -.75.29zm-12.02 12.02a1 1 0 0 1 -.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1 -.7.24zm6.36-14.36a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm0 17a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm-5.66-14.66a1 1 0 0 1 -.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.29zm12.02 12.02a1 1 0 0 1 -.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.24z"></path>
                  </g>
                </svg>
              </span>
              <span className="theme-switch-moon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  <path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
                </svg>
              </span>
              <input
                type="checkbox"
                className="theme-switch-input"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <span className="theme-switch-slider"></span>
            </label>

            {user && (
              <div className="header-inbox-wrap" data-tour="header-inbox">
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
                  {t("common.enter")}
                </Link>
                <Link to="/registro" className="btn btn-header-register">
                  {t("nav.register")}
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

      {mobileOpen &&
        createPortal(
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
              <div className="header-mobile-drawer-head">
                <span className="header-mobile-drawer-title">{t("nav.menu")}</span>
                <button
                  type="button"
                  className="header-mobile-drawer-close"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <IconClose size={22} />
                </button>
              </div>
              <nav className="header-mobile-nav" aria-label="Navegación móvil">
              {navPublic.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={"end" in item ? item.end : undefined}
                  className={() => navLinkClass(item.isActive(location))}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {roleNav()}
            </nav>

            <div className="header-mobile-theme">
              <span className="header-mobile-theme-label">Tema</span>
              <label className="theme-switch" aria-label="Cambiar tema claro/oscuro">
                <span className="theme-switch-sun" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <g fill="#ffd43b">
                      <circle r="5" cy="12" cx="12"></circle>
                      <path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1 -.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1 -.75.29zm-12.02 12.02a1 1 0 0 1 -.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1 -.7.24zm6.36-14.36a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm0 17a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm-5.66-14.66a1 1 0 0 1 -.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.29zm12.02 12.02a1 1 0 0 1 -.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.24z"></path>
                    </g>
                  </svg>
                </span>
                <span className="theme-switch-moon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                    <path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
                  </svg>
                </span>
                <input
                  type="checkbox"
                  className="theme-switch-input"
                  checked={isDarkMode}
                  onChange={toggleTheme}
                />
                <span className="theme-switch-slider"></span>
              </label>
            </div>

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
                {isRole("patrocinador") && (
                  <Link
                    to="/patrocinio"
                    className="header-mobile-menu-item header-mobile-menu-item--highlight"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("nav.myAds")}
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
          </>,
          document.body,
        )}
    </header>
  );
}
