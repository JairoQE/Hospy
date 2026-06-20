export type OwnerPanelTab = "dashboard" | "hospedajes" | "reservas" | "consultas" | "nuevo";

export function tabFromParams(searchParams: URLSearchParams): OwnerPanelTab {
  const t = searchParams.get("tab");
  if (t === "consultas" || t === "mensajes") return "consultas";
  if (t === "reservas") return "reservas";
  if (t === "nuevo") return "nuevo";
  if (t === "hospedajes") return "hospedajes";
  return "dashboard";
}

export function ownerTabPath(tab: OwnerPanelTab): string {
  if (tab === "dashboard") return "/panel";
  return `/panel?tab=${tab}`;
}

/** Calendario de ocupación en Reservas, opcionalmente filtrado por local. */
export function ownerCalendarPath(accommodationId?: number): string {
  const base = "/panel?tab=reservas";
  if (accommodationId == null) return `${base}#calendario-ocupacion`;
  return `${base}&hospedaje=${accommodationId}#calendario-ocupacion`;
}

export function activeOwnerTab(pathname: string, searchParams: URLSearchParams): OwnerPanelTab {
  if (/^\/panel\/hospedajes\/\d+/.test(pathname)) return "hospedajes";
  if (pathname === "/panel" || pathname === "/panel/") {
    return tabFromParams(searchParams);
  }
  return "dashboard";
}
