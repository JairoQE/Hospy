import type { ChatDockSession } from "../context/ChatDockContext";

/** Identificador estable por conversación / hospedaje. */
export function dockSessionId(session: ChatDockSession): string {
  const conv = session.conversationId ?? "new";
  return `${session.mode}-${session.hospedajeId}-${conv}`;
}
