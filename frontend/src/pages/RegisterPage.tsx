import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { SponsorContactConfig } from "../api/types";
import { formatApiError, parseFieldErrors } from "../api/errors";
import { HospyBrand } from "../components/brand/HospyBrand";
import { PrimeIcon } from "../components/PrimeIcon";
import {
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconSpinner,
  IconUser,
  IconWarning,
} from "../components/icons";
import { FacebookSignInButton } from "../components/auth/FacebookSignInButton";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { TurnstileWidget } from "../components/auth/TurnstileWidget";
import { useAuth } from "../context/AuthContext";
import { useCaptchaConfig } from "../hooks/useCaptchaConfig";
import { scorePassword } from "../utils/passwordStrength";
import "../styles/login.css";
import "../styles/register.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyFieldError(key: string, message: string): string {
  const lower = message.toLowerCase();
  if (
    key === "email" &&
    (lower.includes("existe") ||
      lower.includes("registrado") ||
      lower.includes("unique") ||
      lower.includes("ya está"))
  ) {
    return "Este correo ya está registrado. ¿Quieres iniciar sesión?";
  }
  if (key === "password" && lower.includes("común")) {
    return "Elige una contraseña más segura (letras, números y más de 8 caracteres).";
  }
  return message;
}

interface Props {
  asOwner?: boolean;
  asSponsor?: boolean;
}

export function RegisterPage({ asOwner = false, asSponsor = false }: Props) {
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password2: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sponsorConfig, setSponsorConfig] = useState<SponsorContactConfig | null>(null);
  const [sponsorAck, setSponsorAck] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const captcha = useCaptchaConfig();

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  };

  const captchaRequired = captcha.enabled && !captcha.loading;
  const captchaReady = !captchaRequired || Boolean(captchaToken);

  useEffect(() => {
    if (!asSponsor) return;
    api
      .get<SponsorContactConfig>("/anuncios/config/", false)
      .then(setSponsorConfig)
      .catch(() => setSponsorConfig(null));
  }, [asSponsor]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const clientErrors = useMemo(() => {
    const err: Record<string, string> = {};
    if (touched.email) {
      if (!form.email.trim()) {
        err.email = "El correo electrónico es obligatorio.";
      } else if (!EMAIL_RE.test(form.email.trim())) {
        err.email = "Introduce un correo electrónico válido.";
      }
    }
    if (touched.first_name && !form.first_name.trim()) {
      err.first_name = "El nombre es obligatorio.";
    }
    if (touched.last_name && !form.last_name.trim()) {
      err.last_name = "El apellido es obligatorio.";
    }
    if (touched.password && form.password.length > 0 && form.password.length < 8) {
      err.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (
      touched.password2 &&
      form.password2.length > 0 &&
      form.password !== form.password2
    ) {
      err.password2 = "Las contraseñas no coinciden.";
    }
    return err;
  }, [form, touched]);

  const mergedErrors = { ...clientErrors, ...fieldErrors };

  const passwordMatch =
    form.password2.length > 0 && form.password === form.password2;
  const passwordMismatch =
    touched.password2 && form.password2.length > 0 && !passwordMatch;

  const validateAll = (): boolean => {
    const next: Record<string, boolean> = {
      email: true,
      first_name: true,
      last_name: true,
      password: true,
      password2: true,
    };
    setTouched((t) => ({ ...t, ...next }));

    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) return false;
    if (!form.first_name.trim() || !form.last_name.trim()) return false;
    if (form.password.length < 8) return false;
    if (form.password !== form.password2) return false;
    return true;
  };

  const socialBusy = loading || googleLoading || facebookLoading || success;

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setFieldErrors({});
    if (asSponsor && !sponsorAck) {
      setError(
        "Debes confirmar que contactarás al administrador por WhatsApp para el acuerdo financiero.",
      );
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential, {
        asOwner: asOwner && !asSponsor,
        asSponsor,
      });
      setSuccess(true);
      window.setTimeout(() => {
        navigate(asSponsor ? "/patrocinio" : asOwner ? "/panel" : "/", { replace: true });
      }, 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
      } else {
        setError("No se pudo registrar con Google. Inténtalo de nuevo.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookToken = async (accessToken: string) => {
    setError("");
    setFieldErrors({});
    if (asSponsor && !sponsorAck) {
      setError(
        "Debes confirmar que contactarás al administrador por WhatsApp para el acuerdo financiero.",
      );
      return;
    }
    setFacebookLoading(true);
    try {
      await loginWithFacebook(accessToken, {
        asOwner: asOwner && !asSponsor,
        asSponsor,
      });
      setSuccess(true);
      window.setTimeout(() => {
        navigate(asSponsor ? "/patrocinio" : asOwner ? "/panel" : "/", { replace: true });
      }, 900);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
      } else {
        setError("No se pudo registrar con Facebook. Inténtalo de nuevo.");
      }
    } finally {
      setFacebookLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!validateAll()) return;
    if (asSponsor && !sponsorAck) {
      setError(
        "Debes confirmar que contactarás al administrador por WhatsApp para el acuerdo financiero.",
      );
      return;
    }

    setLoading(true);
    try {
      await register(
        {
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          password: form.password,
        },
        {
          asOwner: asOwner && !asSponsor,
          asSponsor,
          captchaToken: captchaToken || undefined,
        },
      );
      setSuccess(true);
      window.setTimeout(() => {
        navigate(asSponsor ? "/patrocinio" : asOwner ? "/panel" : "/", { replace: true });
      }, 1400);
    } catch (err) {
      resetCaptcha();
      if (err instanceof ApiError) {
        const parsed = parseFieldErrors(err.data);
        const friendly: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          friendly[k] = friendlyFieldError(k, v);
        }
        setFieldErrors(friendly);
        setError(formatApiError(err.data));
      } else {
        setError("No se pudo registrar. Comprueba tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const ownerLink = asOwner ? "/registro" : "/registro-propietario";
  const ownerLabel = asOwner
    ? "Registrarme como huésped"
    : "Quiero publicar hospedajes";
  const sponsorLink = asSponsor ? "/registro" : "/registro-patrocinador";
  const sponsorLabel = asSponsor
    ? "Registrarme como huésped"
    : "¿Deseas patrocinar este sistema?";

  const title = asSponsor
    ? "Registro patrocinador"
    : asOwner
      ? "Registro propietario"
      : "Crear cuenta";
  const subtitle = asSponsor
    ? "Los anuncios requieren un acuerdo financiero con el administrador. Tras registrarte, contáctalo por WhatsApp; cuando apruebe tu cuenta podrás subir creativos."
    : asOwner
      ? "Un administrador validará tu cuenta como anfitrión. Cuando te aprueben podrás publicar hospedajes."
      : "Con tu cuenta podrás reservar hospedajes. El inicio de sesión es con tu correo.";
  const submitLabel = asSponsor
    ? "Solicitar cuenta de patrocinador"
    : asOwner
      ? "Solicitar cuenta de propietario"
      : "Crear cuenta";

  return (
    <div className="login-page register-page">
      <div className="login-card register-card">
        <header className="login-card-header">
          <HospyBrand />
        </header>

        <h1 className="login-title">{title}</h1>
        <p className="login-subtitle">{subtitle}</p>

        {asSponsor && !success && (
          <aside className="sponsor-register-notice" role="note">
            <strong>Acuerdo financiero obligatorio</strong>
            <p>
              Antes de publicar anuncios debes coordinar precio y condiciones con el
              administrador de Hospy por WhatsApp.
            </p>
            {sponsorConfig?.admin_whatsapp_url ? (
              <a
                href={sponsorConfig.admin_whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm sponsor-wa-btn"
              >
                <PrimeIcon name="pi-whatsapp" size={16} /> Contactar administrador
              </a>
            ) : (
              <p className="muted">WhatsApp del administrador no configurado (HOSPY_ADMIN_WHATSAPP).</p>
            )}
          </aside>
        )}

        {success && (
          <div
            className="login-alert login-alert--success"
            role="status"
            aria-live="polite"
          >
            ¡Cuenta creada! Te llevamos al inicio en un momento…
          </div>
        )}

        {!success && (
          <form onSubmit={submit} noValidate>
            <Field
              id="reg-email"
              label="Correo electrónico"
              icon={<IconMail size={18} />}
              error={mergedErrors.email}
            >
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => touch("email")}
                required
                aria-required="true"
                className={mergedErrors.email ? "login-input--error" : undefined}
                aria-invalid={Boolean(mergedErrors.email)}
                aria-describedby={mergedErrors.email ? "reg-email-err" : undefined}
              />
            </Field>

            <div className="register-name-row">
              <Field
                id="reg-first"
                label="Nombre"
                icon={<IconUser size={18} />}
                error={mergedErrors.first_name}
              >
                <input
                  id="reg-first"
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  onBlur={() => touch("first_name")}
                  required
                  className={mergedErrors.first_name ? "login-input--error" : undefined}
                  aria-invalid={Boolean(mergedErrors.first_name)}
                />
              </Field>
              <Field
                id="reg-last"
                label="Apellido"
                icon={<IconUser size={18} />}
                error={mergedErrors.last_name}
              >
                <input
                  id="reg-last"
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  onBlur={() => touch("last_name")}
                  required
                  className={mergedErrors.last_name ? "login-input--error" : undefined}
                  aria-invalid={Boolean(mergedErrors.last_name)}
                />
              </Field>
            </div>

            <div className="register-password-row">
              <div className="login-field">
                <label htmlFor="reg-password">Contraseña</label>
                <div className="login-password-wrap">
                  <div className="register-input-icon-wrap">
                    <span className="register-input-icon" aria-hidden>
                      <IconLock size={18} />
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      onBlur={() => touch("password")}
                      required
                      className={mergedErrors.password ? "login-input--error" : undefined}
                      aria-invalid={Boolean(mergedErrors.password)}
                      aria-describedby="reg-password-hint"
                    />
                  </div>
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
                {mergedErrors.password && (
                  <p className="register-field-error" role="alert">
                    <IconWarning size={14} />
                    {mergedErrors.password}
                  </p>
                )}
              </div>

              <div className="login-field">
                <label htmlFor="reg-password2">Repetir contraseña</label>
                <div className="login-password-wrap">
                  <div className="register-input-icon-wrap register-input-icon-wrap--confirm">
                    <span className="register-input-icon" aria-hidden>
                      <IconLock size={18} />
                    </span>
                    <input
                      id="reg-password2"
                      type={showPassword2 ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password2}
                      onChange={(e) => set("password2", e.target.value)}
                      onBlur={() => touch("password2")}
                      required
                      className={
                        mergedErrors.password2
                          ? "login-input--error"
                          : passwordMatch
                            ? "login-input--ok"
                            : undefined
                      }
                      aria-invalid={Boolean(mergedErrors.password2 || passwordMismatch)}
                    />
                    {form.password2.length > 0 && (
                      <span
                        className={`register-input-status${
                          passwordMatch
                            ? " register-input-status--ok"
                            : " register-input-status--err"
                        }`}
                        aria-hidden
                      >
                        {passwordMatch ? <IconCheck size={20} /> : <IconWarning size={20} />}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword2((v) => !v)}
                    aria-label={
                      showPassword2 ? "Ocultar repetición" : "Mostrar repetición"
                    }
                  >
                    {showPassword2 ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
                {mergedErrors.password2 && (
                  <p className="register-field-error" role="alert">
                    <IconWarning size={14} />
                    {mergedErrors.password2}
                  </p>
                )}
              </div>
            </div>

            <div className="register-password-meta">
              <p id="reg-password-hint" className="register-hint">
                Usa 8+ caracteres con letras y números
              </p>
              {form.password.length > 0 && (
                <div className="register-strength" aria-live="polite">
                  <div className="register-strength-bar">
                    <div
                      className={`register-strength-fill register-strength-fill--${strength.tone}`}
                      style={{ width: `${strength.percent}%` }}
                      role="progressbar"
                      aria-valuenow={strength.score}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label={`Fortaleza: ${strength.label}`}
                    />
                  </div>
                  {strength.label && (
                    <p className="register-strength-label">{strength.label}</p>
                  )}
                </div>
              )}
            </div>

            {asSponsor && (
              <label className="register-sponsor-ack">
                <input
                  type="checkbox"
                  checked={sponsorAck}
                  onChange={(e) => setSponsorAck(e.target.checked)}
                />
                Confirmo que contactaré al administrador por WhatsApp para el acuerdo financiero
                antes de esperar la publicación de mis anuncios.
              </label>
            )}

            {error && (
              <div
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
                onExpire={resetCaptcha}
                onError={resetCaptcha}
              />
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading || !captchaReady}
            >
              {loading ? (
                <>
                  <IconSpinner size={20} />
                  Creando cuenta…
                </>
              ) : (
                submitLabel
              )}
            </button>
          </form>
        )}

        {!success && (
          <>
            <div className="register-social" aria-label="Registro con redes sociales">
              <p className="register-social-title">Regístrate con</p>
              <div className="register-social-grid">
                <div className="register-social-google-cell">
                  <GoogleSignInButton
                    mode="register"
                    disabled={socialBusy}
                    onCredential={(credential) => void handleGoogleCredential(credential)}
                    onError={(message) => setError(message)}
                  />
                </div>
                <FacebookSignInButton
                  mode="register"
                  disabled={socialBusy}
                  onAccessToken={(token) => void handleFacebookToken(token)}
                  onError={(message) => setError(message)}
                />
              </div>
            </div>

            <div className="login-divider" aria-hidden>
              <span>o</span>
            </div>
          </>
        )}

        <div className="login-links">
          <p className="login-link-primary">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
          {!asSponsor && (
            <Link
              to={ownerLink}
              className={`login-link-secondary${asOwner ? "" : " register-owner-link"}`}
            >
              <PrimeIcon name="pi-building" size={16} /> {ownerLabel}
            </Link>
          )}
          {!asOwner && !asSponsor && (
            <Link to={sponsorLink} className="login-link-secondary register-sponsor-link">
              <PrimeIcon name="pi-flag" size={16} /> {sponsorLabel}
            </Link>
          )}
          {asSponsor && (
            <Link to={sponsorLink} className="login-link-secondary">
              Registrarme como huésped
            </Link>
          )}
        </div>

        {!asOwner && !asSponsor && (
          <aside className="register-demo" aria-label="Información de prueba">
            <strong>¿Solo quieres probar?</strong>
            Usa el inicio de sesión con la demo: huesped@hospy.local / Huesped123!
          </aside>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="login-field">
      <label htmlFor={id}>{label}</label>
      {icon ? (
        <div className="register-input-icon-wrap">
          <span className="register-input-icon" aria-hidden>
            {icon}
          </span>
          {children}
        </div>
      ) : (
        children
      )}
      {error && (
        <p id={`${id}-err`} className="register-field-error" role="alert">
          <IconWarning size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
