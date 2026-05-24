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
      <div className="admin-sidebar-brand">
        <Link to="/admin" className="admin-sidebar-brand-link" onClick={onCloseMobile}>
          <HospyIcon size={32} className="admin-sidebar-brand-icon" />
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
    </aside>
  );
}
