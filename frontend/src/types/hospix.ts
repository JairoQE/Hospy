/** Tipos del asistente Hospix (chatbot Hospy). */

export type HospixAudience = "guest" | "huesped" | "propietario" | "admin";

export type HospixActionType = "flow" | "navigate" | "send" | "retry";

export interface HospixAction {
  id: string;
  label: string;
  type: HospixActionType;
  /** Ruta interna (navigate) o id de flujo (flow). */
  target?: string;
  /** Texto que se envía como mensaje del usuario (send). */
  message?: string;
}

export interface HospixCard {
  id: string;
  name: string;
  location: string;
  price: string;
  image?: string;
  link: string;
  type?: string;
  type_label?: string;
}

export type HospixMessageRole = "hospix" | "user" | "system";

export interface HospixMessage {
  id: string;
  role: HospixMessageRole;
  text?: string;
  /** Lista markdown muy básica: **negrita**, viñetas con "- ". */
  markdown?: string;
  actions?: HospixAction[];
  chips?: HospixAction[];
  cards?: HospixCard[];
  at: number;
  pending?: boolean;
}

export interface HospixFlowState {
  flowId: string | null;
  step: number;
  data: Record<string, string>;
}

export interface HospixContext {
  audience: HospixAudience;
  pathname: string;
  isAuthenticated: boolean;
  userName?: string;
  formalTone: boolean;
  inboxUnread: number;
}

export interface HospixTurnResult {
  replies: Omit<HospixMessage, "id" | "at">[];
  nextState: HospixFlowState;
}

/** Contrato API futura (POST /api/v1/hospix/chat/). */
export interface HospixChatRequest {
  message: string;
  session_id?: string;
  context: {
    role: HospixAudience;
    pathname: string;
    flow_id?: string | null;
    flow_step?: number;
    flow_data?: Record<string, string>;
  };
}

export interface HospixChatResponse {
  session_id: string;
  replies: Omit<HospixMessage, "id" | "at">[];
  flow_id?: string | null;
  flow_step?: number;
  flow_data?: Record<string, string>;
}
