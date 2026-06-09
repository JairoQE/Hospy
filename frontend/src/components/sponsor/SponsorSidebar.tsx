import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { HospyIcon } from "../brand/HospyIcon";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  showCollapseControl?: boolean;
};

const NAV = [{ to: "/patrocinio", label: "Mis anuncios", icon: "pi-images", end: true }] as const;

export function SponsorSidebar({
  collapsed,
  onCloseMobile,
  onToggleCollapse,
  showCollapseControl = false,
}: Props) {
  const { isSponsorApproved } = useAuth();
  const approved = isSponsorApproved();
  const { pathname } = useLocation();

  return (
    <aside
      className={`sponsor-sidebar${collapsed ? " is-collapsed" : ""}`}
      aria-label="Menú de patrocinador"
    >
      <div className="sponsor-sidebar-bg" aria-hidden />
      <div className="sponsor-sidebar-inner">
        <div className="sponsor-sidebar-brand">
          <Link
            to="/"
            className="sponsor-sidebar-brand-link"
            onClick={onCloseMobile}
            aria-label="Ir al inicio de Hospy"
            title="Ir al inicio"
          >
            <HospyIcon size={32} className="sponsor-sidebar-brand-icon sponsor-sidebar-brand-logo" />
            {!collapsed && <span className="sponsor-sidebar-brand-name">Hospy</span>}
          </Link>
          {showCollapseControl && onToggleCollapse && (
            <button
              type="button"
              className="sponsor-sidebar-collapse"
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

        {approved && (
          <nav className="sponsor-sidebar-nav">
            <ul>
              {NAV.map((item) => {
                const isActive =
                  item.end
                    ? pathname === item.to || pathname === `${item.to}/`
                    : pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`sponsor-sidebar-link${isActive ? " is-active" : ""}`}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                    >
                      <PrimeIcon name={item.icon} size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="sponsor-sidebar-footer">
          <Link
            to="/"
            className="sponsor-sidebar-home-link"
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
