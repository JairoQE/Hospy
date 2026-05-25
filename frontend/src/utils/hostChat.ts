import type { UserRole } from "../api/types";

/** Roles que pueden iniciar chat de consulta con un anfitrión (vía hospedaje). */
export function canInquireHost(role: UserRole | undefined): boolean {
  return role === "huesped" || role === "administrador";
}
