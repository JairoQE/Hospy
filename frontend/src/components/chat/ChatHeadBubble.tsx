import type { ReactNode } from "react";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  label: string;
  onActivate: () => void;
  /** Solo chats con personas; Hospix no lleva X en la burbuja. */
  onClose?: () => void;
  children: ReactNode;
  badge?: number;
  variant?: "peer" | "hospix";
};

/** Burbuja circular estilo Facebook Messenger (chat head). */
export function ChatHeadBubble({
  label,
  onActivate,
  onClose,
  children,
  badge,
  variant = "peer",
}: Props) {
  return (
    <div className={`chat-head-bubble-wrap chat-head-bubble-wrap--${variant}`}>
      <button
        type="button"
        className="chat-head-bubble"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onActivate();
        }}
        aria-label={label}
        title={label}
      >
        {children}
        {badge != null && badge > 0 && (
          <span className="chat-head-bubble-badge" aria-hidden>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      {onClose != null && (
        <button
          type="button"
          className="chat-head-bubble-close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label={`Cerrar ${label}`}
          title="Cerrar"
        >
          <PrimeIcon name="pi-times" size={12} />
        </button>
      )}
    </div>
  );
}
