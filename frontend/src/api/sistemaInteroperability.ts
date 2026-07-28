import { api } from "./client";

export type SistemaInterface = {
  id: string;
  name: string;
  external_system: string;
  usage: string;
  verification: string;
  reference_endpoints: string[];
  specified: boolean;
  functional: boolean;
  counts_as_A: boolean;
};

export type InterfacesCatalog = {
  metric: string;
  name: string;
  name_es: string;
  formula: string;
  A: number;
  B: number;
  X: number | null;
  X_percent: number | null;
  scope_note?: string;
  interfaces: SistemaInterface[];
  related_documentation?: Record<string, string>;
};

export type SistemaProtocol = {
  id: string;
  name: string;
  scope: string;
  standard: string;
  usage: string;
  reference_endpoints: string[];
  specified: boolean;
  supported: boolean;
  counts_as_A: boolean;
};

export type ProtocolsCatalog = {
  metric: string;
  name_es?: string;
  A: number;
  B: number;
  X: number | null;
  X_percent: number | null;
  protocols: SistemaProtocol[];
};

export async function fetchSistemaInterfaces(): Promise<InterfacesCatalog> {
  return api.get<InterfacesCatalog>("/sistema/interfaces/", false);
}

export async function fetchSistemaProtocolos(): Promise<ProtocolsCatalog> {
  return api.get<ProtocolsCatalog>("/sistema/protocolos/", false);
}
