import { api } from "./client";
import type { User } from "./types";

export type DniPersona = {
  numero: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
};

export async function lookupIdentityDni(dni: string): Promise<{
  detail: string;
  persona: DniPersona;
}> {
  return api.post("/auth/identidad/consultar/", { dni });
}

export async function verifyIdentity(dni: string, updateProfile = true): Promise<{
  detail: string;
  user: User;
}> {
  return api.post("/auth/identidad/verificar/", {
    dni,
    update_profile: updateProfile,
  });
}
