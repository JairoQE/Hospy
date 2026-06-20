import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { displayName, roleLabel } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import { UserAvatar } from "../UserAvatar";
import { OwnerSidebar } from "./OwnerSidebar";
import "../../styles/owner-panel.css";
import "../../styles/shadcn.css";
import "../../styles/charts.css";
import "../../styles/charts-themes.css";

export function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`owner-shell${sidebarCollapsed ? " owner-shell--collapsed" : ""}${mobileNavOpen ? " owner-shell--nav-open" : ""}`}
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="owner-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <OwnerSidebar
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileNavOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        showCollapseControl
      />

      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-topbar-left">
            <button
              type="button"
              className="owner-menu-toggle"
              aria-label="Abrir menú"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              <PrimeIcon name="pi-bars" size={22} />
            </button>
            <span className="owner-topbar-title">Panel del propietario</span>
            <Link to="/" className="owner-topbar-home-link" title="Ir al inicio">
              <PrimeIcon name="pi-home" size={16} />
              <span>Ir al inicio</span>
            </Link>
          </div>

          <div className="owner-topbar-user">
            <Link to="/perfil" className="owner-user-chip">
              {user ? <UserAvatar user={user} size="sm" /> : null}
              <span className="owner-user-meta">
                <span className="owner-user-name">
                  {user ? displayName(user) : "Propietario"}
                </span>
                {user && (
                  <span className="owner-user-role">{roleLabel(user.role)}</span>
                )}
              </span>
            </Link>
            <button type="button" className="owner-logout-btn" onClick={handleLogout}>
              <span className="owner-logout-btn-label">Cerrar sesión</span>
              <span className="owner-logout-btn-short" aria-hidden>
                Salir
              </span>
            </button>
          </div>
        </header>

        <main className="owner-content">
          <div className="shadcn-dashboard min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
