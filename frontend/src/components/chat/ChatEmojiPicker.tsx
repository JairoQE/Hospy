import { useEffect, useRef, useState } from "react";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Caras",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😉", "😎", "🙂", "😅", "🤔", "😴"],
  },
  {
    label: "Gestos",
    emojis: ["👍", "👎", "👋", "🙏", "🤝", "👏", "💪", "✌️", "🤞", "👌", "🙌", "💯"],
  },
  {
    label: "Corazones",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💕", "💖", "💝", "💘"],
  },
  {
    label: "Viaje",
    emojis: ["🏠", "🛏️", "🏨", "🌴", "✈️", "🧳", "📍", "🗺️", "🌅", "⭐", "🔑", "🚪"],
  },
  {
    label: "Otros",
    emojis: ["🔥", "✨", "🎉", "✅", "❌", "⏰", "📅", "💰", "📞", "💬", "📷", "☀️"],
  },
];

type Props = {
  onPick: (emoji: string) => void;
  disabled?: boolean;
};

export function ChatEmojiPicker({ onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const pick = (emoji: string) => {
    onPick(emoji);
    setOpen(false);
  };

  return (
    <div className="messenger-emoji-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`messenger-emoji-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Insertar emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Emoji"
      >
        <span aria-hidden>😊</span>
      </button>

      {open && (
        <div className="messenger-emoji-panel" role="dialog" aria-label="Selector de emojis">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="messenger-emoji-group">
              <p className="messenger-emoji-group-label">{group.label}</p>
              <div className="messenger-emoji-grid">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="messenger-emoji-item"
                    onClick={() => pick(emoji)}
                    aria-label={`Emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function insertEmojiInTextarea(
  textarea: HTMLTextAreaElement | null,
  emoji: string,
  value: string,
  onChange: (next: string) => void,
) {
  if (!textarea) {
    onChange(value + emoji);
    return;
  }
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + emoji.length;
    textarea.setSelectionRange(pos, pos);
  });
}
