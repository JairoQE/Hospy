import { useCallback, useId, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HospyBrand } from "../components/brand/HospyBrand";
import { IconEye, IconEyeOff, IconSpinner, IconWarning } from "../components/icons";
import { PrimeIcon } from "../components/PrimeIcon";
import { FacebookSignInButton } from "../components/auth/FacebookSignInButton";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { TurnstileWidget } from "../components/auth/TurnstileWidget";
import { useAuth } from "../context/AuthContext";
import { useCaptchaConfig } from "../hooks/useCaptchaConfig";
import { ApiError } from "../api/client";
import { formatApiError } from "../api/errors";
import "../styles/login.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_EMAIL = "huesped@hospy.local";
const DEMO_PASSWORD = "Huesped123!";

type LoginLocationState = {
  from?: { pathname: string };
  sessionExpired?: boolean;
  message?: string;
};

export function LoginPage() {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginLocationState;
  const from = state.from?.pathname ?? "/";
  const sessionNotice = state.sessionExpired ? state.message : undefined;

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const captcha = useCaptchaConfig();

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_RE.test(email.trim());
  const captchaRequired = captcha.enabled && !captcha.loading;
  const captchaReady = !captchaRequired || Boolean(captchaToken);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }, []);

  const onCaptchaExpire = useCallback(() => {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }, []);

  const onCaptchaError = useCallback(() => {
    setCaptchaToken("");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!EMAIL_RE.test(email.trim())) return;

    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password, {
        remember,
        captchaToken: captchaToken || undefined,
      });
      navigate(from, { replace: true });
    } catch (err) {
      resetCaptcha();
      if (err instanceof ApiError) {
        const msg = formatApiError(err.data).toLowerCase();
        if (msg.includes("verificación") || msg.includes("captcha")) {
          setError("Completa la verificación de seguridad e inténtalo de nuevo.");
        } else {
          setError("Correo o contraseña incorrectos.");
        }
      } else {
        setError("Correo o contraseña incorrectos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = useCallback(() => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setEmailTouched(false);
    setError("");
  }, []);

  const copyDemo = async () => {
    const text = `Correo: ${DEMO_EMAIL} · Contraseña: ${DEMO_PASSWORD}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      fillDemo();
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-card-header">
          <HospyBrand />
        </header>

        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-subtitle">Usa el correo con el que te registraste.</p>

        {sessionNotice && (
          <div className="login-alert login-alert--info" role="status">
            {sessionNotice}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="login-field">
            <label htmlFor={emailId}>Correo</label>
            <input
              id={emailId}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? `${emailId}-err` : undefined}
              className={emailInvalid ? "login-input--error" : undefined}
            />
            {emailInvalid && (
              <p id={`${emailId}-err`} className="login-field-error" role="alert">
                Introduce un correo electrónico válido.
              </p>
            )}
          </div>

          <div className="login-field">
            <label htmlFor={passwordId}>Contraseña</label>
            <div className="login-password-wrap">
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-describedby={error ? errorId : undefined}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                tabIndex={0}
              >
                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          </div>

          <div className="login-forgot-row">
            <Link to="/recuperar-contraseña" className="login-forgot-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Mantener sesión iniciada
          </label>

          {error && (
            <div
              id={errorId}
              className="login-alert login-alert--error"
              role="alert"
              aria-live="assertive"
            >
              <IconWarning size={18} />
              <span>{error}</span>
            </div>
          )}

          {captchaRequired && (
            <TurnstileWidget
              siteKey={captcha.siteKey}
              resetSignal={captchaReset}
              onToken={setCaptchaToken}
              onExpire={onCaptchaExpire}
              onError={onCaptchaError}
            />
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || emailInvalid || !captchaReady}
          >
            {loading ? (
              <>
                <IconSpinner size={20} />
                Verificando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="login-divider" aria-hidden>
          <span>o</span>
        </div>

        <div className="login-social-wrap">
          <div className="login-social-google">
            <GoogleSignInButton
              mode="login"
              disabled={loading || googleLoading || facebookLoading}
              onCredential={async (credential) => {
                setError("");
                setGoogleLoading(true);
                try {
                  await loginWithGoogle(credential, { loginOnly: true, remember });
                  navigate(from, { replace: true });
                } catch (err) {
                  setError(
                    err instanceof ApiError
                      ? formatApiError(err.data)
                      : "No se pudo iniciar sesión con Google.",
                  );
                } finally {
                  setGoogleLoading(false);
                }
              }}
              onError={(message) => setError(message)}
            />
          </div>
          <FacebookSignInButton
            mode="login"
            disabled={loading || googleLoading || facebookLoading}
            onAccessToken={async (accessToken) => {
              setError("");
              setFacebookLoading(true);
              try {
                await loginWithFacebook(accessToken, { loginOnly: true, remember });
                navigate(from, { replace: true });
              } catch (err) {
                setError(
                  err instanceof ApiError
                    ? formatApiError(err.data)
                    : "No se pudo iniciar sesión con Facebook.",
                );
              } finally {
                setFacebookLoading(false);
              }
            }}
            onError={(message) => setError(message)}
          />
        </div>

        <div className="login-links">
          <p className="login-link-primary">
            ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
          </p>
          <Link to="/registro-propietario" className="login-link-secondary">
            ¿Publicas hospedajes? Registro propietario
          </Link>
        </div>

        <p className="login-explore">
          <Link to="/">Explorar sin cuenta</Link>
        </p>

        <aside className="login-demo" aria-label="Credenciales de demostración">
          <p className="login-demo-title">
            <PrimeIcon name="pi-lock" size={16} /> Demo rápida
          </p>
          <p className="login-demo-creds">
            <span>Correo:</span> <code>{DEMO_EMAIL}</code>
            <span>·</span>
            <span>Contraseña:</span> <code>{DEMO_PASSWORD}</code>
          </p>
          <div className="login-demo-actions">
            <button type="button" className="login-demo-btn" onClick={fillDemo}>
              Rellenar formulario
            </button>
            <button type="button" className="login-demo-btn" onClick={copyDemo}>
              {copied ? "Copiado" : "Copiar credenciales"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
