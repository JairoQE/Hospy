import { resolveMediaUrl } from "../utils/media";

type Props = {
  initial: string;
  photoUrl?: string | null;
  className?: string;
};

export function ChatPeerAvatar({ initial, photoUrl, className = "" }: Props) {
  const src = photoUrl ? resolveMediaUrl(photoUrl) : null;
  const cls = `messenger-peer-avatar${className ? ` ${className}` : ""}`;
  if (src) {
    return <img className={`${cls} messenger-peer-avatar--img`} src={src} alt="" />;
  }
  return <span className={cls}>{initial.charAt(0).toUpperCase()}</span>;
}
