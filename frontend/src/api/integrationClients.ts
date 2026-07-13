import { api } from "./client";

export type IntegrationClientStatus = "pendiente" | "activo" | "revocado";

export type IntegrationClient = {
  id: number;
  name: string;
  organization: string;
  contact_email: string;
  status: IntegrationClientStatus;
  status_display: string;
  key_prefix: string;
  has_api_key: boolean;
  request_count: number;
  last_used_at: string | null;
  notes: string;
  owner_email?: string;
  created_at: string;
  updated_at: string;
};

export type IssueKeyResponse = {
  detail: string;
  api_key: string;
  key_prefix: string;
  client: IntegrationClient;
};

export async function fetchMyIntegrationClients(): Promise<IntegrationClient[]> {
  return api.get<IntegrationClient[]>("/integracion/clientes/mios/");
}

export async function requestIntegrationClient(payload: {
  name: string;
  organization?: string;
  contact_email?: string;
  notes?: string;
}): Promise<{ detail: string; client: IntegrationClient }> {
  return api.post("/integracion/clientes/mios/", payload);
}

export async function issueIntegrationApiKey(id: number): Promise<IssueKeyResponse> {
  return api.post(`/integracion/clientes/mios/${id}/emitir-key/`, {});
}

export async function fetchAdminIntegrationClients(
  status?: IntegrationClientStatus | "",
): Promise<IntegrationClient[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get(`/integracion/clientes/${q}`);
}

export async function decideIntegrationClient(
  id: number,
  payload: { aprobado: boolean; motivo?: string },
): Promise<{ detail: string; client: IntegrationClient }> {
  return api.post(`/integracion/clientes/${id}/decidir/`, payload);
}

export async function revokeIntegrationClient(
  id: number,
): Promise<{ detail: string; client: IntegrationClient }> {
  return api.post(`/integracion/clientes/${id}/revocar/`, {});
}
