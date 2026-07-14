import type { ReactNode } from "react";
import { VerifiedBadge } from "./VerifiedBadge";

type Props = {
  name: ReactNode;
  verified?: boolean | null;
  className?: string;
  badgeSize?: number;
  as?: "span" | "strong" | "p";
};

/** Nombre de usuario con insignia azul si está verificado. */
export function UserNameWithBadge({
  name,
  verified,
  className = "",
  badgeSize = 16,
  as: Tag = "span",
}: Props) {
  return (
    <Tag className={`user-name-with-badge${className ? ` ${className}` : ""}`}>
      <span className="user-name-with-badge-text">{name}</span>
      {verified ? <VerifiedBadge size={badgeSize} /> : null}
    </Tag>
  );
}
