import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import type { InboxCanal, InboxItem } from "../types/inbox";
import { useInboxSummary } from "./useInboxSummary";

export function useInboxChannel(canal: InboxCanal, enabled = true) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChat } = useChatDock();
  const { refresh: refreshSummary } = useInboxSummary(0);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"todas" | "no_leidas">("todas");

  const load = useCallback(async () => {
    if (!enabled || !user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const q =
        filter === "no_leidas"
          ? `/bandeja/?canal=${canal}&no_leidos=1`
          : `/bandeja/?canal=${canal}`;
      const data = await api.get<InboxItem[]>(q);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canal, enabled, filter, user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
  }, [load, user]);

  const openItem = useCallback(
    async (item: InboxItem, onAfterOpen?: () => void) => {
      if (!item.is_read) {
        try {
          await api.post(`/bandeja/${item.id}/leer/`);
          setItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x)),
          );
          refreshSummary();
        } catch {
          /* ignore */
        }
      }
      onAfterOpen?.();

      if (
        item.channel === "mensaje" &&
        item.conversation_id &&
        item.accommodation_id &&
        user
      ) {
        openChat({
          mode: user.role === "propietario" ? "owner" : "guest",
          peerName: item.title,
          peerPhotoUrl: item.sender_photo_url ?? null,
          hospedajeId: item.accommodation_id,
          hospedajeName: item.accommodation_name ?? "",
          conversationId: item.conversation_id,
        });
        return;
      }

      if (item.link) {
        navigate(item.link);
      }
    },
    [navigate, refreshSummary, openChat, user],
  );

  const markAllRead = useCallback(async () => {
    try {
      await api.post(`/bandeja/leer-todo/?canal=${canal}`);
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      refreshSummary();
    } catch {
      /* ignore */
    }
  }, [canal, refreshSummary]);

  return {
    items,
    loading,
    filter,
    setFilter,
    load,
    openItem,
    markAllRead,
    unreadCount: items.filter((i) => !i.is_read).length,
  };
}
