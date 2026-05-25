import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useChatbot } from "../../hooks/useChatbot";
import { PrimeIcon } from "../PrimeIcon";
import { HospixAvatar } from "./HospixAvatar";
import { HospixMessageList } from "./HospixMessageList";
import "../../styles/hospix.css";

const HIDDEN_PREFIXES = ["/admin", "/login", "/registro", "/recuperar-contraseña"];

export function HospixWidget() {
  const { pathname } = useLocation();
  const chat = useChatbot();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const showPanel = chat.isOpen && !chat.isMinimized;
  if (!showPanel) return null;

  const hostClass = [
    "hospix-host",
    "hospix-host--panel-open",
    chat.messengerOpen ? "hospix-host--messenger-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={hostClass} aria-label="Asistente Hospix">
      <section
        className="hospix-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="hospix-title"
      >
        <header className="hospix-header">
          <HospixAvatar size={32} variant="compact" />
          <div className="hospix-header-text">
            <h2 id="hospix-title">Hospix – Asistente Hospy</h2>
            <p>Responde en segundos. Disponible 24/7.</p>
          </div>
          <div className="hospix-header-actions">
            <button
              type="button"
              className="hospix-header-btn"
              onClick={chat.minimize}
              aria-label="Minimizar chat"
              title="Minimizar"
            >
              <PrimeIcon name="pi-minus" size={16} />
            </button>
            <button
              type="button"
              className="hospix-header-btn hospix-header-btn--close"
              onClick={chat.close}
              aria-label="Cerrar chat"
            >
              <PrimeIcon name="pi-times" size={18} />
            </button>
          </div>
        </header>

        <HospixMessageList
          messages={chat.messages}
          isTyping={chat.isTyping}
          formalTone={chat.context.formalTone}
          onAction={chat.handleAction}
        />

        {chat.error && (
          <div className="hospix-error" role="alert">
            <p>{chat.error}</p>
            <button type="button" className="hospix-action-btn" onClick={chat.retry}>
              Reintentar
            </button>
          </div>
        )}

        <footer className="hospix-footer">
          <label className="sr-only" htmlFor="hospix-input">
            Escribe tu pregunta
          </label>
          <input
            id="hospix-input"
            type="text"
            className="hospix-input"
            placeholder="Escribe tu pregunta..."
            disabled={chat.isTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value;
                if (v.trim()) {
                  void chat.sendMessage(v);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          <button
            type="button"
            className="hospix-send"
            aria-label="Enviar mensaje"
            disabled={chat.isTyping}
            onClick={() => {
              const el = document.getElementById("hospix-input") as HTMLInputElement | null;
              if (el?.value.trim()) {
                void chat.sendMessage(el.value);
                el.value = "";
              }
            }}
          >
            <PrimeIcon name="pi-send" size={18} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
