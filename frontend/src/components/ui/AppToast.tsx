import { useEffect, useState } from "react";
import { PrimeIcon } from "../PrimeIcon";

export type AppToastKind = "success" | "error" | "info";

type Toast = { id: number; message: string; kind: AppToastKind };

let pushAppToast: ((message: string, kind?: AppToastKind) => void) | null = null;

export function showAppToast(message: string, kind: AppToastKind = "info") {
  pushAppToast?.(message, kind);
}

export function AppToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushAppToast = (message, kind = "info") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    };
    return () => {
      pushAppToast = null;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="app-toast-host" aria-live="polite" aria-atomic="true">
      {items.map((t) => (
        <div key={t.id} className={`app-toast app-toast--${t.kind}`} role="status">
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
