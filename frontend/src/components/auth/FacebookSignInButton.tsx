import { useEffect, useState } from "react";
import { isFacebookSdkConfigured, loadFacebookSdk } from "../../utils/loadFacebookSdk";

type Props = {
  mode?: "login" | "register";
  disabled?: boolean;
  onAccessToken: (token: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

const appId = import.meta.env.VITE_FACEBOOK_APP_ID?.trim() ?? "";

function facebookLabel(mode: "login" | "register", loading: boolean): string {
  if (loading) return "Conectando…";
  return mode === "register" ? "Registrarse con Facebook" : "Continuar con Facebook";
}

export function FacebookSignInButton({
  mode = "login",
  disabled,
  onAccessToken,
  onError,
  className = "",
}: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!appId) return;
    loadFacebookSdk(appId)
      .then(() => setReady(true))
      .catch((err: Error) => onError?.(err.message));
  }, [onError]);

  const handleClick = () => {
    if (!appId || !ready || !window.FB || disabled || loading) return;
    setLoading(true);
    window.FB.login(
      (response) => {
        setLoading(false);
        const token = response.authResponse?.accessToken;
        if (token) {
          onAccessToken(token);
          return;
        }
        if (response.status === "not_authorized") {
          onError?.("No autorizaste el acceso con Facebook.");
        } else {
          onError?.("Inicio de sesión con Facebook cancelado.");
        }
      },
      { scope: "public_profile,email" },
    );
  };

  const label = facebookLabel(mode, loading);

  if (!isFacebookSdkConfigured()) {
    return (
      <button
        type="button"
        className={`register-social-btn register-social-btn--facebook ${className}`.trim()}
        disabled
        title="Configura VITE_FACEBOOK_APP_ID y FACEBOOK_APP_ID en el servidor"
      >
        <span className="register-social-fb-icon" aria-hidden>
          f
        </span>
        <span className="register-social-btn-label">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`register-social-btn register-social-btn--facebook register-social-btn--active ${className}`.trim()}
      disabled={!ready || disabled || loading}
      onClick={handleClick}
      aria-busy={loading}
    >
      <span className="register-social-fb-icon" aria-hidden>
        f
      </span>
      <span className="register-social-btn-label">{label}</span>
    </button>
  );
}
