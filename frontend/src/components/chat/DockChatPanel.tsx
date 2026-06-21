import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  fetchAccommodationInquiry,
  fetchConversationMessages,
  markChatInboxRead,
  sendAccommodationInquiry,
  sendConversationMessage,
} from "../../api/messaging";
import type { ChatMessage } from "../../api/types";
import type { ChatDockSession } from "../../context/ChatDockContext";
import { useAuth } from "../../context/AuthContext";
import { useInboxSummary } from "../../hooks/useInboxSummary";
import { MessengerChatUI } from "../MessengerChatUI";

type Props = {
  session: ChatDockSession;
  onMinimize: () => void;
  onClose: () => void;
};

export function DockChatPanel({ session, onMinimize, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [peerPhotoUrl, setPeerPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const { refresh: refreshInbox } = useInboxSummary();

  const markThreadRead = useCallback(
    (convId: number) => {
      void markChatInboxRead(convId)
        .then(() => refreshInbox())
        .catch(() => undefined);
    },
    [refreshInbox],
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      if (session.mode === "owner" && session.conversationId) {
        const msgs = await fetchConversationMessages(session.conversationId);
        setMessages(msgs);
        setConversationId(session.conversationId);
        markThreadRead(session.conversationId);
        setPeerPhotoUrl(session.peerPhotoUrl ?? null);
      } else {
        const data = await fetchAccommodationInquiry(session.hospedajeId);
        setMessages(data.messages);
        const convId = data.conversation?.id ?? session.conversationId ?? null;
        setConversationId(convId);
        setPeerPhotoUrl(data.propietario_foto_url ?? session.peerPhotoUrl ?? null);
        if (convId) markThreadRead(convId);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onClose();
        return;
      }
      if (e instanceof ApiError && e.status === 403) {
        setError(e.message || "No tienes permiso para usar este chat.");
        setMessages([]);
        return;
      }
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el chat");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user, session, markThreadRead, onClose]);

  useEffect(() => {
    if (!user) return;
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [user, session, load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(".messenger-chat--dock .messenger-input")?.focus();
    }, 120);
    return () => window.clearTimeout(t);
  }, [session.hospedajeId, session.conversationId]);

  const send = async () => {
    if (!user) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      if (session.mode === "owner" && conversationId) {
        await sendConversationMessage(conversationId, text);
        const msgs = await fetchConversationMessages(conversationId);
        setMessages(msgs);
        markThreadRead(conversationId);
      } else {
        const data = await sendAccommodationInquiry(session.hospedajeId, text);
        setMessages(data.messages);
        const convId = data.conversation?.id ?? conversationId;
        if (convId) {
          setConversationId(convId);
          markThreadRead(convId);
        }
        if (data.propietario_foto_url) setPeerPhotoUrl(data.propietario_foto_url);
      }
      setDraft("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onClose();
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError(err.message || "No tienes permiso para enviar mensajes en este chat.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <MessengerChatUI
      variant="dock"
      title={session.peerName}
      subtitle={session.hospedajeName}
      peerInitial={session.peerName}
      peerPhotoUrl={peerPhotoUrl}
      messages={messages}
      loading={loading}
      emptyHint={
        session.mode === "owner"
          ? "Responde la consulta del huésped."
          : "Escribe tu primera pregunta al anfitrión antes de reservar."
      }
      draft={draft}
      onDraftChange={setDraft}
      onSend={send}
      sending={sending}
      error={error}
      onMinimize={onMinimize}
      onClose={onClose}
    />
  );
}
