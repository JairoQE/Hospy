import { useCallback, useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
};

let pushToast: ((message: string, kind?: ToastKind) => void) | null = null;

export function showSponsorToast(message: string, kind: ToastKind = "success") {
  pushToast?.(message, kind);
}

export function SponsorToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    pushToast = add;
    return () => {
      pushToast = null;
    };
  }, [add]);

  if (items.length === 0) return null;

  return (
    <div className="sponsor-toast-host" aria-live="polite" aria-atomic="true">
      {items.map((t) => (
        <div key={t.id} className={`sponsor-toast sponsor-toast--${t.kind}`} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
