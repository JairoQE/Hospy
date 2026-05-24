import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "../api/client";
import {
  fetchAccommodationInquiry,
  fetchConversationMessages,
  markChatInboxRead,
  sendAccommodationInquiry,
  sendConversationMessage,
} from "../api/messaging";
import type { ChatMessage } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import { useInboxSummary } from "../hooks/useInboxSummary";
import { ChatPeerAvatar } from "./ChatPeerAvatar";
import { MessengerChatUI } from "./MessengerChatUI";

/** Chat flotante global (esquina inferior derecha, estilo Facebook). */
function resetChatState(
  setters: {
    setMessages: (v: ChatMessage[]) => void;
    setConversationId: (v: number | null) => void;
    setPeerPhotoUrl: (v: string | null) => void;
    setDraft: (v: string) => void;
    setError: (v: string) => void;
    setLoading: (v: boolean) => void;
    setMinimized: (v: boolean) => void;
  },
) {
  setters.setMessages([]);
  setters.setConversationId(null);
  setters.setPeerPhotoUrl(null);
  setters.setDraft("");
  setters.setError("");
  setters.setLoading(false);
  setters.setMinimized(false);
}

export function GlobalChatDock() {
  const { user } = useAuth();
  const { session, open, closeChat } = useChatDock();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [peerPhotoUrl, setPeerPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const { refresh: refreshInbox } = useInboxSummary(0);

  const purgeLocalChat = useCallback(() => {
    resetChatState({
      setMessages,
      setConversationId,
      setPeerPhotoUrl,
      setDraft,
      setError,
      setLoading,
      setMinimized,
    });
  }, []);

  useEffect(() => {
    if (!user) {
      closeChat();
      purgeLocalChat();
    }
  }, [user, closeChat, purgeLocalChat]);

  const markThreadRead = useCallback(
    (convId: number) => {
      void markChatInboxRead(convId)
        .then(() => refreshInbox())
        .catch(() => undefined);
    },
    [refreshInbox],
  );

  const load = useCallback(async () => {
    if (!user || !session) return;
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
        if (data.propietario_foto_url) {
          setPeerPhotoUrl(data.propietario_foto_url);
        } else {
          setPeerPhotoUrl(session.peerPhotoUrl ?? null);
        }
        if (convId) markThreadRead(convId);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        closeChat();
        purgeLocalChat();
        return;
      }
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el chat");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user, session, markThreadRead, closeChat, purgeLocalChat]);

  useEffect(() => {
    if (!user || !open || !session) {
      purgeLocalChat();
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [user, open, session, load, purgeLocalChat]);

  useEffect(() => {
    if (open && !minimized) {
      const t = window.setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>(".messenger-chat--dock .messenger-input")?.focus();
      }, 120);
      return () => window.clearTimeout(t);
    }
  }, [open, minimized]);

  const send = async () => {
    if (!user || !session) return;
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
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        closeChat();
        purgeLocalChat();
        return;
      }
      setError(err instanceof ApiError ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  if (!user || !open || !session || typeof document === "undefined") return null;

  const peerName = session.peerName;
  const subtitle = session.hospedajeName;

  return createPortal(
    <div className="messenger-dock-host" role="presentation">
      {minimized ? (
        <button
          type="button"
          className="messenger-dock-bar"
          onClick={() => setMinimized(false)}
          aria-label={`Abrir chat con ${peerName}`}
        >
          <ChatPeerAvatar
            initial={peerName}
            photoUrl={peerPhotoUrl}
            className="messenger-peer-avatar--sm"
          />
          <span className="messenger-dock-bar-name">{peerName}</span>
          <span className="messenger-dock-bar-sub muted">{subtitle}</span>
          <button
            type="button"
            className="messenger-dock-bar-close"
            onClick={(e) => {
              e.stopPropagation();
              closeChat();
            }}
            aria-label="Cerrar chat"
          >
            ×
          </button>
        </button>
      ) : (
        <MessengerChatUI
          variant="dock"
          title={peerName}
          subtitle={subtitle}
          peerInitial={peerName}
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
          onMinimize={() => setMinimized(true)}
          onClose={closeChat}
        />
      )}
    </div>,
    document.body,
  );
}
