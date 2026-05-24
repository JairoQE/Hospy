import type { User } from "../api/types";
import { displayName } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";

type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  user: Pick<User, "first_name" | "last_name" | "email" | "photo" | "photo_url">;
  size?: Size;
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: Props) {
  const src = resolveMediaUrl(user.photo_url ?? user.photo);
  const name = displayName(user);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`user-avatar user-avatar-${size}${className ? ` ${className}` : ""}`}
      aria-hidden={!src}
    >
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span className="user-avatar-fallback">{initial}</span>
      )}
    </div>
  );
}
