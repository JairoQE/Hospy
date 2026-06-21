import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { dockSessionId } from "../utils/chatDockId";

export type ChatDockSession = {
  mode: "guest" | "owner";
  peerName: string;
  peerPhotoUrl?: string | null;
  peerUserId?: number;
  peerProfilePath?: string;
  hospedajeId: number;
  hospedajeName: string;
  conversationId?: number | null;
};

export type DockChatWindow = {
  id: string;
  session: ChatDockSession;
};

type ChatDockContextValue = {
  windows: DockChatWindow[];
  activeId: string | null;
  activeWindow: DockChatWindow | null;
  minimizedWindows: DockChatWindow[];
  /** Compat: ventana activa o la más reciente */
  session: ChatDockSession | null;
  open: boolean;
  openChat: (session: ChatDockSession) => void;
  closeChat: (id?: string) => void;
  minimizeChat: () => void;
  expandChat: (id: string) => void;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

export function ChatDockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [windows, setWindows] = useState<DockChatWindow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setWindows([]);
      setActiveId(null);
    }
  }, [user]);

  const openChat = useCallback((next: ChatDockSession) => {
    if (!user) return;
    const id = dockSessionId(next);
    setWindows((prev) => {
      const exists = prev.some((w) => w.id === id);
      if (exists) {
        return prev.map((w) => (w.id === id ? { ...w, session: next } : w));
      }
      return [...prev, { id, session: next }];
    });
    setActiveId(id);
  }, [user]);

  const closeChat = useCallback((id?: string) => {
    const target = id ?? activeId;
    if (!target) return;
    setWindows((prev) => {
      const next = prev.filter((w) => w.id !== target);
      setActiveId((cur) => {
        if (cur !== target) return cur;
        return next.length ? next[next.length - 1]!.id : null;
      });
      return next;
    });
  }, [activeId]);

  const minimizeChat = useCallback(() => {
    setActiveId(null);
  }, []);

  const expandChat = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const activeWindow = useMemo(
    () => windows.find((w) => w.id === activeId) ?? null,
    [windows, activeId],
  );

  const minimizedWindows = useMemo(
    () => windows.filter((w) => w.id !== activeId),
    [windows, activeId],
  );

  const value = useMemo(
    () => ({
      windows,
      activeId,
      activeWindow,
      minimizedWindows,
      session: activeWindow?.session ?? windows[windows.length - 1]?.session ?? null,
      open: windows.length > 0,
      openChat,
      closeChat,
      minimizeChat,
      expandChat,
    }),
    [
      windows,
      activeId,
      activeWindow,
      minimizedWindows,
      openChat,
      closeChat,
      minimizeChat,
      expandChat,
    ],
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}

export function useChatDock() {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error("useChatDock debe usarse dentro de ChatDockProvider");
  return ctx;
}
