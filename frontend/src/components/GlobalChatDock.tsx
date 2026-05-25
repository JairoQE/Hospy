import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import { DockChatPanel } from "./chat/DockChatPanel";

/** Ventana de chat expandida (las burbujas van en FloatingChatHeads). */
export function GlobalChatDock() {
  const { user } = useAuth();
  const { activeWindow, minimizeChat, closeChat } = useChatDock();

  if (!user || !activeWindow || typeof document === "undefined") return null;

  return createPortal(
    <div className="messenger-dock-host messenger-dock-host--expanded" role="presentation">
      <DockChatPanel
        session={activeWindow.session}
        onMinimize={minimizeChat}
        onClose={() => closeChat(activeWindow.id)}
      />
    </div>,
    document.body,
  );
}
