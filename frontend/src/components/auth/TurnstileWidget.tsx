import { useCallback, useEffect, useRef, useState } from "react";
import { IconSpinner } from "../icons";
import { loadTurnstileScript } from "../../utils/loadTurnstile";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  resetSignal?: number;
};

type WidgetStatus = "loading" | "ready" | "error";

const LOAD_TIMEOUT_MS = 20_000;

function turnstileTheme(): "light" | "dark" | "auto" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

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
  const [status, setStatus] = useState<WidgetStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  callbacksRef.current = { onToken, onExpire, onError };

  const mountWidget = useCallback(
    async (forceScript = false) => {
      if (!siteKey.trim()) {
        setStatus("error");
        return;
      }

      setStatus("loading");

      try {
        await loadTurnstileScript({ force: forceScript });
        if (!containerRef.current || !window.turnstile) {
          throw new Error("Turnstile unavailable");
        }

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: turnstileTheme(),
          size: "normal",
          retry: "auto",
          "refresh-expired": "auto",
          callback: (token) => {
            setStatus("ready");
            callbacksRef.current.onToken(token);
          },
          "expired-callback": () => {
            setStatus("loading");
            callbacksRef.current.onExpire?.();
          },
          "error-callback": () => {
            setStatus("error");
            callbacksRef.current.onError?.();
          },
        });
      } catch {
        setStatus("error");
        callbacksRef.current.onError?.();
      }
    },
    [siteKey],
  );

  useEffect(() => {
    let cancelled = false;

    void mountWidget(attempt > 0).then(() => {
      if (cancelled) return;
    });

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setStatus((current) => (current === "loading" ? "error" : current));
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetSignal, attempt, mountWidget]);

  const retry = () => {
    callbacksRef.current.onError?.();
    setAttempt((n) => n + 1);
  };

  return (
    <div className="auth-captcha" aria-label="Verificación de seguridad">
      <div
        ref={containerRef}
        className={`auth-captcha-widget${status === "loading" ? " auth-captcha-widget--loading" : ""}`}
      />
      {status === "loading" && (
        <p className="auth-captcha-loading" role="status" aria-live="polite">
          <IconSpinner size={16} />
          Cargando verificación de seguridad…
        </p>
      )}
      {status === "error" && (
        <div className="auth-captcha-error-block" role="alert">
          <p className="auth-captcha-error">
            La verificación tardó demasiado o no pudo cargarse. Comprueba tu conexión o que el
            dominio esté autorizado en Cloudflare Turnstile.
          </p>
          <button type="button" className="auth-captcha-retry" onClick={retry}>
            Reintentar verificación
          </button>
        </div>
      )}
      {status !== "error" && (
        <p className="auth-captcha-hint muted">
          Verificación anti-bots para proteger tu cuenta.
        </p>
      )}
    </div>
  );
}
