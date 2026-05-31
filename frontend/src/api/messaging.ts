import { api } from "./client";
import type { ChatInquiryResponse, ChatMessage, Conversation, MessageReport } from "./types";

export function fetchAccommodationInquiry(hospedajeId: number) {
  return api.get<ChatInquiryResponse>(`/hospedajes/${hospedajeId}/consulta/`);
}

export function sendAccommodationInquiry(hospedajeId: number, body: string) {
  return api.post<ChatInquiryResponse>(`/hospedajes/${hospedajeId}/consulta/`, {
    body,
  });
}

export function fetchConversationMessages(conversationId: number) {
  return api.get<ChatMessage[]>(`/conversaciones/${conversationId}/mensajes/`);
}

export function sendConversationMessage(conversationId: number, body: string) {
  return api.post<ChatMessage>(`/conversaciones/${conversationId}/mensajes/`, {
    body,
  });
}

export function openConversation(accommodationId: number) {
  return api.post<Conversation>("/conversaciones/", { accommodation: accommodationId });
}

export type MessageReportReason =
  | "ofensivo"
  | "acoso"
  | "spam"
  | "estafa"
  | "otro";

export function reportChatMessage(
  messageId: number,
  payload: { reason: MessageReportReason; detail?: string },
) {
  return api.post<{ id: number; detail: string }>(
    `/mensajes/${messageId}/reportar/`,
    payload,
  );
}

export function fetchMessageReports(estado: "pendiente" | "todos" = "pendiente") {
  return api.get<MessageReport[]>(`/mensajes-reportados/?estado=${estado}`);
}

export function fetchPlatformConversations(q?: string) {
  const qs = new URLSearchParams();
  if (q?.trim()) qs.set("q", q.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api.get<Conversation[]>(`/conversaciones/plataforma/${suffix || ""}`);
}

export function markChatInboxRead(conversationId: number) {
  return api.post(`/conversaciones/${conversationId}/leer-bandeja/`);
}

export function resolveMessageReport(
  reportId: number,
  payload: { status: "revisado" | "descartado"; admin_notes?: string },
) {
  return api.post<MessageReport>(`/mensajes-reportados/${reportId}/resolver/`, payload);
}

export const MESSAGE_REPORT_REASONS: { value: MessageReportReason; label: string }[] = [
  { value: "ofensivo", label: "Contenido ofensivo" },
  { value: "acoso", label: "Acoso o amenazas" },
  { value: "spam", label: "Spam o publicidad" },
  { value: "estafa", label: "Estafa o engaño" },
  { value: "otro", label: "Otro" },
];
