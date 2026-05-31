import { useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../../api/client";
import type { User } from "../../api/types";
import { IconEye, IconEyeOff } from "../icons";
import { scorePassword } from "../../utils/passwordStrength";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  user: User;
  onUpdated: () => Promise<void>;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id}>
      {label}
      <div className="profile-password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="profile-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
      {hint && (
        <span id={`${id}-hint`} className="profile-field-hint">
          {hint}
        </span>
      )}
    </label>
  );
}

export function ProfileSecuritySection({ user, onUpdated }: Props) {
  const requiresCurrentPassword = user.has_password !== false;

  const [emailForm, setEmailForm] = useState({
    email: user.email,
    current_password: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password2: "",
  });

  const [emailMsg, setEmailMsg] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setEmailForm((f) => ({ ...f, email: user.email }));
  }, [user.email]);

  const strength = useMemo(
    () => scorePassword(passwordForm.new_password),
    [passwordForm.new_password],
  );

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg("");
    setEmailError("");

    const nextEmail = emailForm.email.trim().toLowerCase();
    if (!EMAIL_RE.test(nextEmail)) {
      setEmailError("Introduce un correo válido.");
      return;
    }
    if (nextEmail === user.email.toLowerCase()) {
      setEmailError("El correo es el mismo que el actual.");
      return;
    }
    if (requiresCurrentPassword && !emailForm.current_password) {
      setEmailError("Confirma tu contraseña actual.");
      return;
    }

    setSavingEmail(true);
    try {
      const payload: Record<string, string> = { email: nextEmail };
      if (requiresCurrentPassword) {
        payload.current_password = emailForm.current_password;
      }
      await api.post<{ detail: string; user: User }>(
        "/auth/perfil/cambiar-email/",
        payload,
      );
      setEmailForm((f) => ({ ...f, current_password: "" }));
      await onUpdated();
      setEmailMsg("Correo actualizado. Usa el nuevo correo para iniciar sesión.");
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "No se pudo cambiar el correo");
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (requiresCurrentPassword && !passwordForm.current_password) {
      setPasswordError("Confirma tu contraseña actual.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password2) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSavingPassword(true);
    try {
      const payload: Record<string, string> = {
        new_password: passwordForm.new_password,
        new_password2: passwordForm.new_password2,
      };
      if (requiresCurrentPassword) {
        payload.current_password = passwordForm.current_password;
      }
      await api.post("/auth/perfil/cambiar-contrasena/", payload);
      setPasswordForm({ current_password: "", new_password: "", new_password2: "" });
      await onUpdated();
      setPasswordMsg("Contraseña actualizada correctamente.");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="card profile-security-card">
      <h2>Seguridad de la cuenta</h2>
      <p className="muted profile-form-hint">
        Antes de publicar en la nube, cambia el correo y la contraseña por unos propios y seguros.
      </p>

      <div className="profile-security-blocks">
        <form className="profile-security-block" onSubmit={saveEmail}>
          <h3>Cambiar correo electrónico</h3>
          <label>
            Nuevo correo
            <input
              type="email"
              value={emailForm.email}
              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
              autoComplete="email"
              required
            />
          </label>
          {requiresCurrentPassword && (
            <PasswordField
              id="email-current-password"
              label="Contraseña actual"
              value={emailForm.current_password}
              onChange={(v) => setEmailForm({ ...emailForm, current_password: v })}
              autoComplete="current-password"
            />
          )}
          {emailMsg && <p className="success-msg">{emailMsg}</p>}
          {emailError && <p className="error-msg">{emailError}</p>}
          <button type="submit" className="btn btn-secondary btn-sm" disabled={savingEmail}>
            {savingEmail ? "Guardando…" : "Actualizar correo"}
          </button>
        </form>

        <form className="profile-security-block" onSubmit={savePassword}>
          <h3>
            {requiresCurrentPassword ? "Cambiar contraseña" : "Establecer contraseña"}
          </h3>
          {requiresCurrentPassword ? (
            <PasswordField
              id="pwd-current"
              label="Contraseña actual"
              value={passwordForm.current_password}
              onChange={(v) => setPasswordForm({ ...passwordForm, current_password: v })}
              autoComplete="current-password"
            />
          ) : (
            <p className="profile-field-hint">
              Tu cuenta usa inicio con Google o Facebook. Puedes definir una contraseña para
              entrar también con correo.
            </p>
          )}
          <PasswordField
            id="pwd-new"
            label="Nueva contraseña"
            value={passwordForm.new_password}
            onChange={(v) => setPasswordForm({ ...passwordForm, new_password: v })}
            autoComplete="new-password"
            hint="Mínimo 8 caracteres; combina letras, números y símbolos."
          />
          {passwordForm.new_password.length > 0 && (
            <div className="profile-password-strength" aria-live="polite">
              <div className="profile-password-strength-bar">
                <span
                  className={`profile-password-strength-fill profile-password-strength-fill--${strength.tone}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <span className="profile-password-strength-label">{strength.label}</span>
            </div>
          )}
          <PasswordField
            id="pwd-new2"
            label="Repetir nueva contraseña"
            value={passwordForm.new_password2}
            onChange={(v) => setPasswordForm({ ...passwordForm, new_password2: v })}
            autoComplete="new-password"
          />
          {passwordMsg && <p className="success-msg">{passwordMsg}</p>}
          {passwordError && <p className="error-msg">{passwordError}</p>}
          <button type="submit" className="btn btn-secondary btn-sm" disabled={savingPassword}>
            {savingPassword ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </section>
  );
}
