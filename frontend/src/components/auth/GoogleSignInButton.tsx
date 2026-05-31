import { useGoogleOAuth } from "@react-oauth/google";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  mode: "login" | "register";
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";

export function isGoogleAuthConfigured() {
  return Boolean(clientId);
}

function googleLabel(mode: "login" | "register", loading: boolean): string {
  if (loading) return "Conectando…";
  return mode === "register" ? "Registrarse con Google" : "Acceder con Google";
}

function GoogleGIcon() {
  return (
    <svg
      className="register-social-google-icon"
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.24 5.46-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  mode,
  disabled,
  onCredential,
  onError,
  className = "",
}: Props) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const gsiHostRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const disabledRef = useRef(disabled);

  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;
  disabledRef.current = disabled;

  const finishLoading = useCallback(() => setLoading(false), []);

  useEffect(() => {
    if (!clientId || !scriptLoadedSuccessfully || !gsiHostRef.current) return;
    const gsi = window.google?.accounts?.id;
    if (!gsi) return;

    const host = gsiHostRef.current;
    host.innerHTML = "";

    const handleCredential = (res: { credential?: string }) => {
      finishLoading();
      if (disabledRef.current) return;
      if (res.credential) onCredentialRef.current(res.credential);
      else onErrorRef.current?.("No se recibió credencial de Google.");
    };

    gsi.initialize({
      client_id: clientId,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    gsi.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: mode === "login" ? "signin_with" : "signup_with",
      shape: "rectangular",
      width: 240,
    });

    setGsiReady(Boolean(host.querySelector('[role="button"]')));
  }, [clientId, scriptLoadedSuccessfully, mode, finishLoading]);

  const handleClick = () => {
    if (!clientId || !gsiReady || disabled || loading) return;
    const gsiButton = gsiHostRef.current?.querySelector('[role="button"]') as HTMLElement | null;
    if (!gsiButton) {
      onError?.("No se pudo conectar con Google.");
      return;
    }
    setLoading(true);
    gsiButton.click();
  };

  const label = googleLabel(mode, loading);
  const busy = loading;
  const ready = scriptLoadedSuccessfully && gsiReady;

  if (!clientId) {
    return (
      <button
        type="button"
        className={`register-social-btn register-social-btn--google ${className}`.trim()}
        disabled
        title="Configura VITE_GOOGLE_CLIENT_ID en el frontend y GOOGLE_OAUTH_CLIENT_ID en el backend"
      >
        <GoogleGIcon />
        <span className="register-social-btn-label">{label}</span>
      </button>
    );
  }

  return (
    <>
      <div ref={gsiHostRef} className="register-social-google-gsi-host" aria-hidden />
      <button
        type="button"
        className={`register-social-btn register-social-btn--google register-social-btn--active ${className}`.trim()}
        disabled={!ready || disabled || busy}
        onClick={handleClick}
        aria-busy={busy}
      >
        <GoogleGIcon />
        <span className="register-social-btn-label">{label}</span>
      </button>
    </>
  );
}
