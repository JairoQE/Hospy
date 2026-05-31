import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { displayName } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import { SponsorSidebar } from "./SponsorSidebar";
import "../../styles/sponsor-panel.css";

export function SponsorLayout() {
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
      className={`sponsor-shell${sidebarCollapsed ? " sponsor-shell--collapsed" : ""}${mobileNavOpen ? " sponsor-shell--nav-open" : ""}`}
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="sponsor-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <SponsorSidebar
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileNavOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        showCollapseControl
      />

      <div className="sponsor-main">
        <header className="sponsor-topbar">
          <div className="sponsor-topbar-left">
            <button
              type="button"
              className="sponsor-menu-toggle"
              aria-label="Abrir menú"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              <PrimeIcon name="pi-bars" size={22} />
            </button>
            <span className="sponsor-topbar-title">Panel de patrocinador</span>
            <Link to="/" className="sponsor-topbar-home-link">
              <PrimeIcon name="pi-home" size={16} />
              <span>Ir al inicio</span>
            </Link>
          </div>

          <div className="sponsor-topbar-user">
            <Link to="/perfil" className="sponsor-user-chip">
              <span className="sponsor-user-avatar" aria-hidden>
                <PrimeIcon name="pi-user" size={18} />
              </span>
              <span className="sponsor-user-name">
                {user ? displayName(user) : "Patrocinador"}
              </span>
            </Link>
            <button type="button" className="sponsor-logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="sponsor-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
