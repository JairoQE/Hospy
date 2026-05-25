import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useChatDock } from "../../context/ChatDockContext";
import { useChatbot } from "../../hooks/useChatbot";
import { ChatPeerAvatar } from "../ChatPeerAvatar";
import { HospixAvatar } from "../hospix/HospixAvatar";
import { ChatHeadBubble } from "./ChatHeadBubble";
import "../../styles/chat-heads.css";

const HIDDEN_HOSPIX = ["/admin", "/login", "/registro", "/recuperar-contraseña"];

export function FloatingChatHeads() {
  const { pathname } = useLocation();
  const { minimizedWindows, activeWindow, expandChat, closeChat } = useChatDock();
  const chat = useChatbot();

  const showHospix = !HIDDEN_HOSPIX.some((p) => pathname.startsWith(p));
  const hospixAsBubble = showHospix && (!chat.isOpen || chat.isMinimized);
  const hospixExpanded = showHospix && chat.isOpen && !chat.isMinimized;

  if (minimizedWindows.length === 0 && !hospixAsBubble) return null;
  if (typeof document === "undefined") return null;

  const stackClass = [
    "chat-head-stack",
    activeWindow ? "chat-head-stack--above-messenger" : "",
    hospixExpanded ? "chat-head-stack--above-hospix" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={stackClass} aria-label="Chats minimizados">
      {minimizedWindows.map((w) => (
        <ChatHeadBubble
          key={w.id}
          label={`Abrir chat con ${w.session.peerName}`}
          onActivate={() => expandChat(w.id)}
          onClose={() => closeChat(w.id)}
          variant="peer"
        >
          <ChatPeerAvatar
            initial={w.session.peerName}
            photoUrl={w.session.peerPhotoUrl}
            className="chat-head-bubble-avatar"
          />
        </ChatHeadBubble>
      ))}
      {hospixAsBubble && (
        <ChatHeadBubble
          label="Abrir Hospix"
          onActivate={() => chat.openFromBubble()}
          badge={chat.badgeCount}
          variant="hospix"
        >
          <HospixAvatar size={56} variant="compact" animated className="chat-head-hospix-avatar" />
        </ChatHeadBubble>
      )}
    </div>,
    document.body,
  );
}
