import { useEffect, useRef, useState } from "react";
import { loadTurnstileScript } from "../../utils/loadTurnstile";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  resetSignal?: number;
};

export function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  onError,
  resetSignal = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onToken, onExpire, onError });
  const [loadError, setLoadError] = useState(false);

  callbacksRef.current = { onToken, onExpire, onError };

  useEffect(() => {
    if (!siteKey.trim()) {
      setLoadError(true);
      return;
    }

    let cancelled = false;
    setLoadError(false);

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          size: "normal",
          callback: (token) => {
            setLoadError(false);
            callbacksRef.current.onToken(token);
          },
          "expired-callback": () => callbacksRef.current.onExpire?.(),
          "error-callback": () => {
            setLoadError(true);
            callbacksRef.current.onError?.();
          },
        });
      })
      .catch(() => {
        setLoadError(true);
        callbacksRef.current.onError?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetSignal]);

  return (
    <div className="auth-captcha" aria-label="Verificación de seguridad">
      <div ref={containerRef} className="auth-captcha-widget" />
      {loadError && (
        <p className="auth-captcha-error" role="alert">
          No se pudo cargar la verificación. Comprueba que el dominio esté autorizado en
          Turnstile o recarga la página.
        </p>
      )}
      <p className="auth-captcha-hint muted">
        Verificación anti-bots para proteger tu cuenta.
      </p>
    </div>
  );
}
