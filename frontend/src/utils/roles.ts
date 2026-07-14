import type { CapabilityRole, User, UserRole } from "../api/types";

/** Roles/capacidades efectivos para UI (multirol). */
export function userCapabilities(user: User | null | undefined): CapabilityRole[] {
  if (!user) return [];
  if (user.roles && user.roles.length > 0) return user.roles;
  const roles: CapabilityRole[] = [];
  if (user.role === "propietario") {
    roles.push("propietario", "huesped");
  } else if (user.role === "administrador") {
    roles.push("administrador", "huesped");
  } else if (user.role === "patrocinador") {
    roles.push("patrocinador", "huesped");
  } else {
    roles.push("huesped");
  }
  if (user.is_developer) roles.push("desarrollador");
  if (user.is_identity_verified) roles.push("verificado");
  return roles;
}

export function hasCapability(
  user: User | null | undefined,
  capability: CapabilityRole,
): boolean {
  return userCapabilities(user).includes(capability);
}

/** Cualquier usuario autenticado puede alquilar (multirol). */
export function canBookAsGuest(user: User | null | undefined): boolean {
  return Boolean(user);
}

/** Roles que pueden iniciar chat de consulta con un anfitrión (vía hospedaje). */
export function canInquireHost(role: UserRole | undefined): boolean {
  return (
    role === "huesped" ||
    role === "administrador" ||
    role === "propietario" ||
    role === "patrocinador"
  );
}
