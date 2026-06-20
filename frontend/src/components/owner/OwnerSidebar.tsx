import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  activeOwnerTab,
  ownerTabPath,
  type OwnerPanelTab,
} from "../../utils/ownerPanelRoutes";
import { HospyIcon } from "../brand/HospyIcon";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  showCollapseControl?: boolean;
};

const NAV: { id: OwnerPanelTab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "pi-chart-bar" },
  { id: "hospedajes", label: "Mis hospedajes", icon: "pi-home" },
  { id: "reservas", label: "Reservas", icon: "pi-calendar" },
  { id: "consultas", label: "Consultas", icon: "pi-comments" },
];

export function OwnerSidebar({
  collapsed,
  onCloseMobile,
  onToggleCollapse,
  showCollapseControl = false,
}: Props) {
  const { isOwnerApproved } = useAuth();
  const ownerApproved = isOwnerApproved();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = activeOwnerTab(location.pathname, searchParams);

  return (
    <aside
      className={`owner-sidebar${collapsed ? " is-collapsed" : ""}`}
      aria-label="Menú del propietario"
    >
      <div className="owner-sidebar-bg" aria-hidden />
      <div className="owner-sidebar-inner">
        <div className="owner-sidebar-brand">
          <Link
            to="/"
            className="owner-sidebar-brand-link"
            onClick={onCloseMobile}
            aria-label="Ir al inicio de Hospy"
            title="Ir al inicio"
          >
            <HospyIcon size={32} className="owner-sidebar-brand-icon owner-sidebar-brand-logo" />
            {!collapsed && <span className="owner-sidebar-brand-name">Hospy</span>}
          </Link>
          {showCollapseControl && onToggleCollapse && (
            <button
              type="button"
              className="owner-sidebar-collapse"
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

        {ownerApproved && (
          <nav className="owner-sidebar-nav" data-tour="owner-sidebar-nav">
            <ul>
              {NAV.map((item) => (
                <li key={item.id}>
                  <Link
                    to={ownerTabPath(item.id)}
                    className={`owner-sidebar-link${activeTab === item.id ? " is-active" : ""}`}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                  >
                    <PrimeIcon name={item.icon} size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to={ownerTabPath("nuevo")}
                  className={`owner-sidebar-link owner-sidebar-link--cta${activeTab === "nuevo" ? " is-active" : ""}`}
                  onClick={onCloseMobile}
                  title={collapsed ? "Nuevo local" : undefined}
                >
                  <PrimeIcon name="pi-plus" size={20} />
                  <span>Nuevo local</span>
                </Link>
              </li>
            </ul>
          </nav>
        )}

        <div className="owner-sidebar-footer">
          <Link
            to="/"
            className="owner-sidebar-home-link"
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
