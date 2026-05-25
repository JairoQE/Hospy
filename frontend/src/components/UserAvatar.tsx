import type { User } from "../api/types";
import { displayName } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";

type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  user: Pick<User, "first_name" | "last_name"> & {
    photo?: string | null;
    photo_url?: string | null;
    email?: string;
    username?: string;
  };
  size?: Size;
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: Props) {
  const src = resolveMediaUrl(user.photo_url ?? user.photo);
  const name = displayName({
    ...user,
    email: user.email ?? user.username ?? "?",
  });
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
