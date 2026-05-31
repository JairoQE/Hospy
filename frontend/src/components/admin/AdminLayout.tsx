import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { displayName } from "../../utils/format";
import { PrimeIcon } from "../PrimeIcon";
import { AuditAlertsBanner } from "./AuditAlertsBanner";
import { AdminSidebar } from "./AdminSidebar";
import { AdminUsersToastHost } from "./AdminUsersToast";
import { useAuditAlerts } from "../../hooks/useAuditAlerts";
import "../../styles/admin-panel.css";
import "../../styles/shadcn.css";
import "../../styles/charts.css";
import "../../styles/charts-themes.css";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAdmin = user?.role === "administrador";
  const { pending: auditAlerts, dismiss: dismissAuditAlerts } = useAuditAlerts(Boolean(isAdmin));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`admin-shell${sidebarCollapsed ? " admin-shell--collapsed" : ""}${mobileNavOpen ? " admin-shell--nav-open" : ""}`}
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <AdminSidebar
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileNavOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        showCollapseControl
      />

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-toggle"
              aria-label="Abrir menú"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              <PrimeIcon name="pi-bars" size={22} />
            </button>
            <span className="admin-topbar-title">Panel de administración</span>
            <Link to="/" className="admin-topbar-home-link">
              <PrimeIcon name="pi-home" size={16} />
              <span>Ir al inicio</span>
            </Link>
          </div>

          <div className="admin-topbar-user">
            <Link to="/perfil" className="admin-user-chip">
              <span className="admin-user-avatar" aria-hidden>
                <PrimeIcon name="pi-user" size={18} />
              </span>
              <span className="admin-user-name">{user ? displayName(user) : "Admin"}</span>
            </Link>
            <button type="button" className="admin-logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="admin-content">
          <AdminUsersToastHost />
          {isAdmin && (
            <AuditAlertsBanner alerts={auditAlerts} onDismiss={dismissAuditAlerts} />
          )}
          <div className="shadcn-dashboard min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
