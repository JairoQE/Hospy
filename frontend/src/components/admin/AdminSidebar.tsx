import { Link, NavLink } from "react-router-dom";
import { HospyIcon } from "../brand/HospyIcon";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  showCollapseControl?: boolean;
};

const NAV: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: "/admin", end: true, label: "Dashboard", icon: "pi-chart-bar" },
  { to: "/admin/usuarios", label: "Usuarios", icon: "pi-users" },
  { to: "/admin/moderacion", label: "Hospedajes", icon: "pi-home" },
  { to: "/admin/reservas", label: "Reservas", icon: "pi-calendar" },
  { to: "/admin/consultas", label: "Consultas", icon: "pi-comments" },
  { to: "/admin/registro-actividad", label: "Auditoría", icon: "pi-list" },
  { to: "/admin/inicio", label: "Configuración", icon: "pi-cog" },
];

export function AdminSidebar({
  collapsed,
  onCloseMobile,
  onToggleCollapse,
  showCollapseControl = false,
}: Props) {
  return (
    <aside
      className={`admin-sidebar${collapsed ? " is-collapsed" : ""}`}
      aria-label="Menú de administración"
    >
      <div className="admin-sidebar-bg" aria-hidden />
      <div className="admin-sidebar-inner">
      <div className="admin-sidebar-brand">
        <Link
          to="/"
          className="admin-sidebar-brand-link"
          onClick={onCloseMobile}
          aria-label="Ir al inicio de Hospy"
          title="Ir al inicio"
        >
          <HospyIcon size={32} className="admin-sidebar-brand-icon admin-sidebar-brand-logo" />
          {!collapsed && <span className="admin-sidebar-brand-name">Hospy</span>}
        </Link>
        {showCollapseControl && onToggleCollapse && (
          <button
            type="button"
            className="admin-sidebar-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <PrimeIcon
              name={collapsed ? "pi-angle-right" : "pi-angle-left"}
              size={16}
            />
          </button>
        )}
      </div>
      <nav className="admin-sidebar-nav">
        <ul>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `admin-sidebar-link${isActive ? " is-active" : ""}`
                }
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
              >
                <PrimeIcon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="admin-sidebar-footer">
        <Link
          to="/"
          className="admin-sidebar-home-link"
          onClick={onCloseMobile}
          title="Volver al sitio público"
        >
          <PrimeIcon name="pi-home" size={20} />
          <span>Ir al inicio</span>
        </Link>
      </div>
      </div>
    </aside>
  );
}
