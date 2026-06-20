import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import {
  fetchConversationMessages,
  markChatInboxRead,
  sendConversationMessage,
} from "../api/messaging";
import type { ChatMessage, Conversation } from "../api/types";
import { useInboxSummary } from "../hooks/useInboxSummary";
import { MessengerChatUI } from "./MessengerChatUI";
import { SkeletonOwnerInquiries } from "./ui/Skeleton";

type Props = {
  initialConversationId?: number | null;
};

export function OwnerInquiriesPanel({ initialConversationId = null }: Props) {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { refresh: refreshInbox } = useInboxSummary(0);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Conversation[]>("/conversaciones/");
      setConversations(list);
      const fromUrl =
        initialConversationId ??
        (searchParams.get("conversacion")
          ? Number(searchParams.get("conversacion"))
          : null);
      const pick =
        fromUrl && list.some((c) => c.id === fromUrl) ? fromUrl : (list[0]?.id ?? null);
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return pick;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar consultas");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const msgs = await fetchConversationMessages(convId);
      setMessages(msgs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar mensajes");
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    void markChatInboxRead(selectedId)
      .then(() => refreshInbox())
      .catch(() => undefined);
    const id = window.setInterval(() => void loadMessages(selectedId), 12_000);
    return () => window.clearInterval(id);
  }, [selectedId, loadMessages, refreshInbox]);

  const send = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendConversationMessage(selectedId, draft.trim());
      setDraft("");
      await loadMessages(selectedId);
      await loadConversations();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return <SkeletonOwnerInquiries />;
  }

  if (conversations.length === 0) {
    return (
      <p className="muted">
        Aún no tienes consultas de huéspedes. Aparecerán aquí cuando te escriban desde la ficha
        del hospedaje.
      </p>
    );
  }

  return (
    <div className="owner-inquiries">
      <ul className="owner-inquiries-list">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`owner-inquiry-item${c.id === selectedId ? " is-active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <strong>{c.guest_name}</strong>
              <span className="muted">{c.accommodation_name}</span>
              {c.last_message_preview && (
                <span className="owner-inquiry-preview">{c.last_message_preview}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <MessengerChatUI
          variant="embedded"
          title={selected.guest_name}
          subtitle={selected.accommodation_name}
          peerInitial={selected.guest_name}
          peerPhotoUrl={selected.guest_photo_url}
          messages={messages}
          loading={loading}
          emptyHint="Cuando un huésped te escriba, verás el hilo aquí."
          draft={draft}
          onDraftChange={setDraft}
          onSend={send}
          sending={sending}
          error={error}
        />
      )}
    </div>
  );
}
