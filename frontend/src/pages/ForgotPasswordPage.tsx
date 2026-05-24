import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { HospyBrand } from "../components/brand/HospyBrand";
import { IconSpinner, IconWarning } from "../components/icons";
import "../styles/login.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_RE.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!EMAIL_RE.test(email.trim())) return;

    setLoading(true);
    setError("");
    try {
      await api.post(
        "/auth/reset-password/",
        { email: email.trim() },
        false,
      );
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo enviar el correo. Inténtalo más tarde.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-card-header">
          <HospyBrand />
        </header>

        <h1 className="login-title">Recuperar contraseña</h1>
        <p className="login-subtitle">
          Te enviaremos un enlace si el correo está registrado en Hospy.
        </p>

        {sent ? (
          <div className="login-alert login-alert--success" role="status" aria-live="polite">
            Si el correo está registrado, recibirás instrucciones para restablecer tu
            contraseña. Revisa también la carpeta de spam.
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="login-field">
              <label htmlFor={emailId}>Correo</label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                required
                autoComplete="email"
                className={emailInvalid ? "login-input--error" : undefined}
                aria-invalid={emailInvalid}
              />
              {emailInvalid && (
                <p className="login-field-error" role="alert">
                  Introduce un correo electrónico válido.
                </p>
              )}
            </div>

            {error && (
              <div className="login-alert login-alert--error" role="alert" aria-live="assertive">
                <IconWarning size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading || emailInvalid}
            >
              {loading ? (
                <>
                  <IconSpinner size={20} />
                  Enviando…
                </>
              ) : (
                "Enviar enlace"
              )}
            </button>
          </form>
        )}

        <p className="login-explore" style={{ marginTop: "1.5rem" }}>
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
