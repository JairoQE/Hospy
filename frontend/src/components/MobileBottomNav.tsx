import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useInboxSummary } from "../hooks/useInboxSummary";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isActive?: (pathname: string, search: string) => boolean;
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6 10h4v-4h-4v4zm0-6h4v-4h-4v4zm0-6h4V4h-4v4zm6 6h4v-4h-4v4zm0-6h4v-4h-4v4z"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l6-6-6-6zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"
      />
    </svg>
  );
}

function IconPersonAdd() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

function inboxActive(canal: string) {
  return (pathname: string, search: string) => {
    if (pathname !== "/bandeja") return false;
    const c = new URLSearchParams(search).get("canal");
    if (canal === "notificacion") return !c || c === "notificacion";
    return c === canal;
  };
}

function buildItems(
  isRole: (r: "huesped" | "propietario" | "administrador") => boolean,
  loggedIn: boolean,
  summary: { notificaciones: number; mensajes: number },
): NavItem[] {
  const home: NavItem = {
    to: "/",
    label: "Inicio",
    icon: <IconHome />,
    isActive: (p) => p === "/" || p.startsWith("/hospedajes"),
  };

  if (!loggedIn) {
    return [
      home,
      { to: "/login", label: "Entrar", icon: <IconLogin /> },
      { to: "/registro", label: "Registro", icon: <IconPersonAdd /> },
    ];
  }

  const alerts: NavItem = {
    to: "/bandeja?canal=notificacion",
    label: "Alertas",
    icon: <IconBell />,
    badge: summary.notificaciones,
    isActive: inboxActive("notificacion"),
  };

  const messages: NavItem = {
    to: "/bandeja?canal=mensaje",
    label: "Mensajes",
    icon: <IconChat />,
    badge: summary.mensajes,
    isActive: inboxActive("mensaje"),
  };

  const profile: NavItem = {
    to: "/perfil",
    label: "Perfil",
    icon: <IconUser />,
    isActive: (p) => p.startsWith("/perfil"),
  };

  if (isRole("administrador")) {
    return [
      home,
      alerts,
      messages,
      {
        to: "/admin",
        label: "Moderar",
        icon: <IconShield />,
        isActive: (p) => p === "/admin",
      },
      profile,
    ];
  }

  if (isRole("propietario")) {
    return [
      home,
      alerts,
      messages,
      {
        to: "/panel",
        label: "Panel",
        icon: <IconGrid />,
        isActive: (p) => p.startsWith("/panel"),
      },
      profile,
    ];
  }

  return [
    home,
    alerts,
    messages,
    {
      to: "/mis-reservas",
      label: "Reservas",
      icon: <IconCalendar />,
      isActive: (p) => p.startsWith("/mis-reservas"),
    },
    profile,
  ];
}

export function MobileBottomNav() {
  const { user, isRole } = useAuth();
  const { pathname, search } = useLocation();
  const { summary } = useInboxSummary();
  const items = buildItems(isRole, Boolean(user), summary);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      {items.map((item) => {
        const active = item.isActive
          ? item.isActive(pathname, search)
          : pathname === item.to || pathname.startsWith(`${item.to}/`);

        return (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            className={() => `mobile-tab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-tab-indicator" aria-hidden />
            <span className="mobile-tab-icon">
              {item.icon}
              {item.badge != null && item.badge > 0 && (
                <span className="mobile-tab-badge">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </span>
            <span className="mobile-tab-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
