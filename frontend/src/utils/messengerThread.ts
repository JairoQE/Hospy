import type { ChatMessage } from "../api/types";
import { parseApiDate } from "./format";

export type MessengerThreadRow =
  | { type: "day"; key: string; label: string }
  | {
      type: "message";
      key: string;
      message: ChatMessage;
      showAvatar: boolean;
      tail: boolean;
      showSeen: boolean;
    };

function dayLabel(iso: string): string {
  const date = parseApiDate(iso);
  if (!date) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startMsg.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return date.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayKey(iso: string): string {
  const date = parseApiDate(iso);
  if (!date) return iso;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function lastSeenOutgoingId(messages: ChatMessage[]): number | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.is_mine && m.seen_at) return m.id;
  }
  return null;
}

/** Agrupa mensajes con separadores de día y avatares al estilo Messenger. */
export function buildMessengerThread(messages: ChatMessage[]): MessengerThreadRow[] {
  const rows: MessengerThreadRow[] = [];
  let lastDay = "";
  const seenMessageId = lastSeenOutgoingId(messages);

  messages.forEach((message, index) => {
    const dk = dayKey(message.created_at);
    if (dk !== lastDay) {
      lastDay = dk;
      rows.push({
        type: "day",
        key: `day-${dk}`,
        label: dayLabel(message.created_at),
      });
    }

    const next = messages[index + 1];
    const sameCluster =
      next &&
      next.is_mine === message.is_mine &&
      next.sender === message.sender &&
      dayKey(next.created_at) === dk;

    rows.push({
      type: "message",
      key: `msg-${message.id}`,
      message,
      showAvatar: !message.is_mine && !sameCluster,
      tail: !sameCluster,
      showSeen: !sameCluster && message.id === seenMessageId,
    });
  });

  return rows;
}
