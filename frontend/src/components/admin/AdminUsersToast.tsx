import { useEffect, useState } from "react";
import { PrimeIcon } from "../PrimeIcon";

export type AdminToastKind = "success" | "error" | "info";

type Toast = { id: number; message: string; kind: AdminToastKind };

let pushAdminToast: ((message: string, kind?: AdminToastKind) => void) | null = null;

export function showAdminToast(message: string, kind: AdminToastKind = "success") {
  pushAdminToast?.(message, kind);
}

export function AdminUsersToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushAdminToast = (message, kind = "success") => {
      const id = Date.now();
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      pushAdminToast = null;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="admin-users-toast-host" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`admin-users-toast admin-users-toast--${t.kind}`} role="status">
          <PrimeIcon
            name={
              t.kind === "success"
                ? "pi-check-circle"
                : t.kind === "error"
                  ? "pi-times-circle"
                  : "pi-info-circle"
            }
            size={18}
          />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
