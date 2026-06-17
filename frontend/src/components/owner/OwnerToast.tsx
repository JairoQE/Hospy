import { useEffect, useState } from "react";
import { PrimeIcon } from "../PrimeIcon";

export type OwnerToastKind = "success" | "error" | "info";

type Toast = { id: number; message: string; kind: OwnerToastKind };

let pushOwnerToast: ((message: string, kind?: OwnerToastKind) => void) | null = null;

export function showOwnerToast(message: string, kind: OwnerToastKind = "success") {
  pushOwnerToast?.(message, kind);
}

export function OwnerToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushOwnerToast = (message, kind = "success") => {
      const id = Date.now();
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };
    return () => {
      pushOwnerToast = null;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="owner-toast-host" aria-live="polite" aria-atomic="true">
      {items.map((t) => (
        <div key={t.id} className={`owner-toast owner-toast--${t.kind}`} role="status">
          <PrimeIcon
            name={
              t.kind === "success"
                ? "pi-check-circle"
                : t.kind === "error"
                  ? "pi-times-circle"
                  : "pi-info-circle"
            }
            size={18}
            aria-hidden
          />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
