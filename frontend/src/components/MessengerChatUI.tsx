import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import type { ChatMessage } from "../api/types";
import { buildMessengerThread } from "../utils/messengerThread";
import { formatRelativeTime, formatSeenRelative } from "../utils/relativeTime";
import { ChatPeerAvatar } from "./ChatPeerAvatar";
import { IconSend, IconSpinner } from "./icons";
import { PrimeIcon } from "./PrimeIcon";
import { ReportMessageModal } from "./ReportMessageModal";

type Props = {
  title: string;
  subtitle?: string;
  peerInitial: string;
  peerPhotoUrl?: string | null;
  messages: ChatMessage[];
  loading?: boolean;
  emptyHint?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  sending?: boolean;
  error?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  className?: string;
  /** Ruta al perfil público del otro participante (avatar + nombre). */
  profilePath?: string | null;
  /** embedded = panel propietario; dock = ventana flotante inferior derecha */
  variant?: "embedded" | "dock";
};

export function MessengerChatUI({
  title,
  subtitle,
  peerInitial,
  peerPhotoUrl,
  messages,
  loading = false,
  emptyHint = "Envía un mensaje para iniciar la conversación.",
  draft,
  onDraftChange,
  onSend,
  sending = false,
  error,
  onClose,
  onMinimize,
  className = "",
  profilePath,
  variant = "embedded",
}: Props) {
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [seenTick, setSeenTick] = useState(0);
  const rows = buildMessengerThread(messages);

  const hasSeenReceipt = messages.some((m) => m.is_mine && m.seen_at);
  useEffect(() => {
    if (!hasSeenReceipt) return;
    const id = window.setInterval(() => setSeenTick((t) => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, [hasSeenReceipt]);
  void seenTick;

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [draft]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    void onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!draft.trim() || sending) return;
      void onSend();
    }
  };

  const isDock = variant === "dock";

  const shellClass = [
    "messenger-chat",
    isDock ? "messenger-chat--dock" : "messenger-chat--embedded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} role="dialog" aria-label={`Chat con ${title}`}>
      <header className="messenger-header">
        {profilePath ? (
          <Link
            to={profilePath}
            className="messenger-header-profile-link"
            title="Ver perfil público"
          >
            <ChatPeerAvatar initial={peerInitial} photoUrl={peerPhotoUrl} />
            <div className="messenger-header-text">
              <strong className="messenger-header-name">{title}</strong>
              {subtitle && <span className="messenger-header-sub">{subtitle}</span>}
            </div>
          </Link>
        ) : (
          <>
            <ChatPeerAvatar initial={peerInitial} photoUrl={peerPhotoUrl} />
            <div className="messenger-header-text">
              <strong className="messenger-header-name">{title}</strong>
              {subtitle && <span className="messenger-header-sub">{subtitle}</span>}
            </div>
          </>
        )}
        <div className="messenger-header-actions">
          {isDock && onMinimize && (
            <button
              type="button"
              className="messenger-header-icon"
              onClick={onMinimize}
              aria-label="Minimizar chat"
              title="Minimizar"
            >
              −
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="messenger-header-icon messenger-header-icon--close"
              onClick={onClose}
              aria-label="Cerrar chat"
              title="Cerrar"
            >
              ×
            </button>
          )}
        </div>
      </header>

      <div className="messenger-thread" ref={threadRef}>
        {loading && messages.length === 0 && (
          <div className="messenger-thread-empty">
            <IconSpinner size={28} />
            <p>Cargando mensajes…</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="messenger-thread-empty">
            <PrimeIcon name="pi-comments" className="messenger-thread-empty-icon" size={32} />
            <p>{emptyHint}</p>
          </div>
        )}
        {rows.map((row) => {
          if (row.type === "day") {
            return (
              <div key={row.key} className="messenger-day">
                <span>{row.label}</span>
              </div>
            );
          }
          const { message, showAvatar, tail, showSeen } = row;
          return (
            <div
              key={row.key}
              className={`messenger-row${message.is_mine ? " messenger-row--out" : " messenger-row--in"}${tail ? " messenger-row--tail" : ""}`}
            >
              {!message.is_mine && (
                <div className="messenger-row-avatar">
                  {showAvatar ? (
                    <ChatPeerAvatar
                      initial={message.sender_name}
                      photoUrl={message.sender_photo_url}
                    />
                  ) : null}
                </div>
              )}
              <div className="messenger-bubble-wrap">
                <div className="messenger-bubble-row">
                  <div className="messenger-bubble">{message.body}</div>
                  {!message.is_mine && (
                    <button
                      type="button"
                      className="messenger-report-btn"
                      title="Reportar mensaje"
                      aria-label="Reportar mensaje ofensivo o abusivo"
                      onClick={() => setReportTarget(message)}
                    >
                      ⋯
                    </button>
                  )}
                </div>
                {tail && (
                  <div className="messenger-meta">
                    {showSeen && message.seen_at ? (
                      <span className="messenger-seen" title={message.seen_at}>
                        {formatSeenRelative(message.seen_at)}
                      </span>
                    ) : !message.is_mine ? (
                      <time className="messenger-time" dateTime={message.created_at}>
                        {formatRelativeTime(message.created_at)}
                      </time>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="messenger-error">{error}</p>}

      <form className="messenger-composer" onSubmit={handleSubmit}>
        <div className="messenger-composer-inner">
          <textarea
            ref={inputRef}
            rows={1}
            className="messenger-input"
            placeholder="Aa"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            disabled={sending}
            aria-label="Escribe un mensaje"
          />
          <button
            type="submit"
            className="messenger-send"
            disabled={sending || !draft.trim()}
            aria-label="Enviar mensaje"
          >
            {sending ? <IconSpinner size={20} /> : <IconSend size={20} />}
          </button>
        </div>
      </form>

      {reportTarget && (
        <ReportMessageModal
          message={reportTarget}
          onClose={() => setReportTarget(null)}
          onReported={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
