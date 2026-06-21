import type { UserRole } from "../api/types";

/** Ruta pública del perfil del otro participante en un chat. */
export function peerPublicProfilePath(userId: number, role?: UserRole | null): string {
  if (role === "propietario") return `/anfitrion/${userId}`;
  return `/perfil/${userId}`;
}
