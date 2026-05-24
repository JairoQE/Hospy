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

export type ChatDockSession = {
  mode: "guest" | "owner";
  peerName: string;
  peerPhotoUrl?: string | null;
  hospedajeId: number;
  hospedajeName: string;
  conversationId?: number | null;
};

type ChatDockContextValue = {
  session: ChatDockSession | null;
  open: boolean;
  openChat: (session: ChatDockSession) => void;
  closeChat: () => void;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

export function ChatDockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<ChatDockSession | null>(null);

  /** Sin sesión activa no debe quedar abierto ningún chat (datos privados). */
  useEffect(() => {
    if (!user) {
      setSession(null);
    }
  }, [user]);

  const openChat = useCallback((next: ChatDockSession) => {
    if (!user) return;
    setSession(next);
  }, [user]);

  const closeChat = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      open: Boolean(session),
      openChat,
      closeChat,
    }),
    [session, openChat, closeChat],
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}

export function useChatDock() {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error("useChatDock debe usarse dentro de ChatDockProvider");
  return ctx;
}
