import { api } from "./client";

export type Organization = {
  id: number;
  name: string;
  slug: string;
  description: string;
  location: string;
  logo?: string | null;
  logo_url?: string | null;
  cover?: string | null;
  cover_url?: string | null;
  ruc: string;
  legal_name: string;
  is_verified: boolean;
  verified_at?: string | null;
  is_published: boolean;
  public_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RucEmpresa = {
  ruc: string;
  legal_name: string;
  estado: string;
  condicion: string;
};

export type OrganizationPublic = {
  id: number;
  name: string;
  slug: string;
  description: string;
  location: string;
  logo_url?: string | null;
  cover_url?: string | null;
  legal_name: string;
  is_verified: boolean;
  verified_at?: string | null;
  accommodations: import("./types").OwnerStoreListingItem[];
  accommodations_count: number;
  average_rating: number;
  reviews_count: number;
  titular: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    is_identity_verified?: boolean;
  };
};

export async function fetchMyOrganization(): Promise<{
  organization: Organization | null;
}> {
  return api.get("/empresas/mia/");
}

export async function createOrganization(
  data: FormData | Record<string, unknown>,
): Promise<{ detail: string; organization: Organization }> {
  return api.post("/empresas/mia/", data);
}

export async function updateOrganization(
  data: FormData | Record<string, unknown>,
): Promise<{ detail: string; organization: Organization }> {
  return api.patch("/empresas/mia/", data);
}

export async function lookupOrganizationRuc(ruc: string): Promise<{
  detail: string;
  empresa: RucEmpresa;
}> {
  return api.post("/empresas/mia/ruc/consultar/", { ruc });
}

export async function verifyOrganizationRuc(
  ruc: string,
  updateName = false,
): Promise<{ detail: string; organization: Organization }> {
  return api.post("/empresas/mia/ruc/verificar/", {
    ruc,
    update_name: updateName,
  });
}

export async function fetchOrganizationPublic(
  slug: string,
): Promise<OrganizationPublic> {
  return api.get(`/empresas/${encodeURIComponent(slug)}/`, false);
}
