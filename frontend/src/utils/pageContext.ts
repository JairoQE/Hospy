export type PageKind =
  | "home"
  | "accommodation_detail"
  | "login"
  | "register"
  | "password_reset"
  | "bookings"
  | "inbox"
  | "owner_panel"
  | "sponsor_panel"
  | "admin_panel"
  | "owner_store"
  | "profile"
  | "legal"
  | "info"
  | "not_found";

export type PageInfo = {
  kind: PageKind;
  label: string;
  isError: boolean;
  accommodationId?: string;
};

function normPath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0]?.replace(/\/$/, "") || "/";
  return path || "/";
}

export function describePage(pathname: string): PageInfo {
  const path = normPath(pathname);

  if (path === "/") {
    return { kind: "home", label: "Inicio", isError: false };
  }

  const acc = path.match(/^\/hospedajes\/(\d+)$/);
  if (acc) {
    return {
      kind: "accommodation_detail",
      label: "Ficha de hospedaje",
      isError: false,
      accommodationId: acc[1],
    };
  }

  if (path === "/login") return { kind: "login", label: "Inicio de sesión", isError: false };
  if (path.startsWith("/registro")) return { kind: "register", label: "Registro", isError: false };
  if (path.startsWith("/recuperar")) {
    return { kind: "password_reset", label: "Recuperar contraseña", isError: false };
  }
  if (path === "/mis-reservas") return { kind: "bookings", label: "Mis reservas", isError: false };
  if (path === "/bandeja") return { kind: "inbox", label: "Bandeja", isError: false };
  if (path.startsWith("/panel")) return { kind: "owner_panel", label: "Panel propietario", isError: false };
  if (path.startsWith("/patrocinio")) return { kind: "sponsor_panel", label: "Patrocinio", isError: false };
  if (path.startsWith("/admin")) return { kind: "admin_panel", label: "Administración", isError: false };

  if (/^\/anfitrion\/\d+$/.test(path)) {
    return { kind: "owner_store", label: "Tienda del anfitrión", isError: false };
  }
  if (/^\/perfil(\/\d+)?$/.test(path)) {
    return { kind: "profile", label: "Perfil", isError: false };
  }
  if (/^\/legal\/[^/]+$/.test(path)) {
    return { kind: "legal", label: "Legal", isError: false };
  }
  if (path === "/sobre-nosotros" || path === "/centro-ayuda" || path === "/contacto") {
    return { kind: "info", label: path.slice(1), isError: false };
  }

  return { kind: "not_found", label: "Página no encontrada (404)", isError: true };
}

export function isPageLocationQuestion(text: string): boolean {
  return /(en qu[eé] p[aá]gina|d[oó]nde estoy|p[aá]gina actual|qu[eé] ruta|qu[eé] url|what page|where am i|en qu[eé] sitio|en qu[eé] parte)/i.test(
    text,
  );
}

export function replyPageLocation(pathname: string, formal: boolean): string {
  const page = describePage(pathname);

  if (page.kind === "not_found") {
    return formal
      ? "Se encuentra en una **página no encontrada (404)**. La dirección no existe en Hospy."
      : "Estás en una **página no encontrada (404)**. La URL no existe; usa «Volver al inicio» arriba a la derecha.";
  }
  if (page.kind === "home") {
    return formal
      ? "Está en la **página de inicio** de Hospy."
      : "Estás en la **página de inicio** de Hospy (buscador y destinos).";
  }
  if (page.kind === "accommodation_detail") {
    return formal
      ? "Está viendo la **ficha de un hospedaje**."
      : "Estás en la **ficha de un hospedaje** (detalle con fotos y reserva).";
  }

  return formal
    ? `Se encuentra en: **${page.label}**.`
    : `Estás en: **${page.label}**.`;
}
