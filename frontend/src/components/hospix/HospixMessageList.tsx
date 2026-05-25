import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { HospixAction, HospixMessage } from "../../types/hospix";
import { resolveMediaUrl } from "../../utils/media";
import { HospixAvatar } from "./HospixAvatar";
import { HospixMarkdown } from "./HospixMarkdown";

interface Props {
  messages: HospixMessage[];
  isTyping: boolean;
  formalTone: boolean;
  onAction: (action: HospixAction) => void;
}

export function HospixMessageList({ messages, isTyping, formalTone, onAction }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div
      className="hospix-thread"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Mensajes de Hospix"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`hospix-row hospix-row--${msg.role}`}
        >
          {msg.role === "hospix" && (
            <HospixAvatar size={32} variant="compact" className="hospix-row-avatar" />
          )}
          <div className="hospix-bubble-wrap">
            <div className={`hospix-bubble hospix-bubble--${msg.role}`}>
              {msg.markdown ? (
                <HospixMarkdown text={msg.markdown} />
              ) : (
                msg.text && <p>{msg.text}</p>
              )}
              {msg.cards && msg.cards.length > 0 && (
                <div className="hospix-cards">
                  {msg.cards.map((card) => {
                    const fotoUrl = resolveMediaUrl(card.image);
                    return (
                    <article key={card.id} className="hospix-card">
                      <div
                        className={`hospix-card-img${fotoUrl ? " hospix-card-img--photo" : ""}`}
                      >
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt=""
                            className="hospix-card-img-el"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="hospix-card-img-placeholder">Sin foto</span>
                        )}
                      </div>
                      <div className="hospix-card-body">
                        <strong>{card.name}</strong>
                        {card.type_label ? (
                          <span className="hospix-card-type">{card.type_label}</span>
                        ) : null}
                        <span className="hospix-card-loc">{card.location}</span>
                        <span className="hospix-card-price">{card.price}</span>
                        <Link to={card.link} className="hospix-card-btn">
                          Ver más
                        </Link>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
              {msg.actions && msg.actions.length > 0 && (
                <div className="hospix-actions">
                  {msg.actions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="hospix-action-btn"
                      onClick={() => onAction(a)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.chips && msg.chips.length > 0 && (
              <div className="hospix-chips">
                {msg.chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="hospix-chip"
                    onClick={() => onAction(c)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="hospix-row hospix-row--hospix">
          <HospixAvatar size={32} variant="compact" className="hospix-row-avatar" />
          <div className="hospix-bubble hospix-bubble--hospix hospix-bubble--typing">
            <span className="hospix-typing-label">
              {formalTone ? "Hospix está escribiendo" : "Hospix está escribiendo"}
            </span>
            <span className="hospix-typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
