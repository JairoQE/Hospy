import { useCallback, useEffect, useRef, useState } from "react";
import { useInboxSummary } from "../hooks/useInboxSummary";
import { useAuth } from "../context/AuthContext";
import { InboxDropdownPanel } from "./inbox/InboxDropdownPanel";
import type { InboxCanal } from "../types/inbox";

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
      />
    </svg>
  );
}

type OpenPanel = InboxCanal | null;

export function InboxHeaderButtons() {
  const { user } = useAuth();
  const { summary } = useInboxSummary();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((canal: InboxCanal) => {
    setOpenPanel((prev) => (prev === canal ? null : canal));
  }, []);

  const close = useCallback(() => setOpenPanel(null), []);

  useEffect(() => {
    if (!openPanel) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [openPanel, close]);

  if (!user) return null;

  return (
    <div className="inbox-header-buttons" ref={wrapRef}>
      <div className="inbox-dropdown-anchor">
        <button
          type="button"
          className={`inbox-header-btn${openPanel === "notificacion" ? " is-active" : ""}`}
          aria-label={`Notificaciones${summary.notificaciones ? `, ${summary.notificaciones} sin leer` : ""}`}
          aria-expanded={openPanel === "notificacion"}
          onClick={() => toggle("notificacion")}
        >
          <IconBell />
          {summary.notificaciones > 0 && (
            <span className="inbox-badge">
              {summary.notificaciones > 9 ? "9+" : summary.notificaciones}
            </span>
          )}
        </button>
        <InboxDropdownPanel
          canal="notificacion"
          open={openPanel === "notificacion"}
          onClose={close}
        />
      </div>

      <div className="inbox-dropdown-anchor">
        <button
          type="button"
          className={`inbox-header-btn${openPanel === "mensaje" ? " is-active" : ""}`}
          aria-label={`Mensajes${summary.mensajes ? `, ${summary.mensajes} sin leer` : ""}`}
          aria-expanded={openPanel === "mensaje"}
          onClick={() => toggle("mensaje")}
        >
          <IconChat />
          {summary.mensajes > 0 && (
            <span className="inbox-badge inbox-badge-chat">
              {summary.mensajes > 9 ? "9+" : summary.mensajes}
            </span>
          )}
        </button>
        <InboxDropdownPanel canal="mensaje" open={openPanel === "mensaje"} onClose={close} />
      </div>
    </div>
  );
}
