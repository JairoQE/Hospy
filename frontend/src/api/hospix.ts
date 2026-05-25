import { api } from "./client";
import type { HospixFlowState, HospixMessage } from "../types/hospix";

const SESSION_KEY = "hospix-session-v1";

export function getHospixSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setHospixSessionId(id: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

export interface HospixApiFlowState {
  flow_id?: string | null;
  flow_step?: number;
  flow_data?: Record<string, string>;
}

export interface HospixApiResponse {
  session_id: string;
  replies: Omit<HospixMessage, "id" | "at">[];
  flow_state?: HospixApiFlowState;
  source?: "llm" | "rules";
}

export interface HospixApiRequest {
  message?: string;
  pathname?: string;
  session_id?: string;
  welcome?: boolean;
  history?: { role: "user" | "assistant"; content: string }[];
  action_id?: string;
  action_target?: string;
}

export function mapFlowState(fs?: HospixApiFlowState): HospixFlowState {
  return {
    flowId: fs?.flow_id ?? null,
    step: fs?.flow_step ?? 0,
    data: (fs?.flow_data as Record<string, string>) ?? {},
  };
}

/** Usa backend si está disponible (por defecto sí). */
export function hospixUseBackend(): boolean {
  return import.meta.env.VITE_HOSPIX_USE_LOCAL !== "true";
}

export async function postHospixChat(body: HospixApiRequest): Promise<HospixApiResponse> {
  return api.post<HospixApiResponse>("/hospix/chat/", body, true);
}
