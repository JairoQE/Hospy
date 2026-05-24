import type { InboxItem } from "../../types/inbox";
import { formatRelativeTime } from "../../utils/relativeTime";
import { ChatPeerAvatar } from "../ChatPeerAvatar";

interface Props {
  item: InboxItem;
  compact?: boolean;
  onClick: () => void;
}

export function InboxItemRow({ item, compact = false, onClick }: Props) {
  const displayName = item.sender_name || item.title;
  const timeIso = item.thread_at ?? item.created_at;

  return (
    <button
      type="button"
      className={`inbox-item${item.is_read ? "" : " is-unread"}${compact ? " inbox-item-compact" : ""}`}
      onClick={onClick}
    >
      <ChatPeerAvatar
        initial={displayName}
        photoUrl={item.sender_photo_url}
        className="inbox-item-avatar-slot messenger-peer-avatar--sm"
      />
      <div className="inbox-item-body">
        <div className="inbox-item-top">
          {compact ? (
            <p className="inbox-item-title">
              <strong>{item.title}</strong>
              {item.body && (
                <span className="inbox-item-inline-body"> {item.body}</span>
              )}
            </p>
          ) : (
            <strong>{item.title}</strong>
          )}
          <time className="inbox-item-time muted">{formatRelativeTime(timeIso)}</time>
        </div>
        {!compact && item.sender_name && (
          <span className="inbox-item-sender muted">De {item.sender_name}</span>
        )}
        {!compact && item.body && <p className="inbox-item-text">{item.body}</p>}
      </div>
      {!item.is_read && <span className="inbox-item-dot" aria-hidden />}
    </button>
  );
}
