import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../../api/client";
import type { User } from "../../api/types";

type PayoutForm = {
  payout_document_number: string;
  payout_mp_email: string;
  payout_bank_cci: string;
};

const emptyForm: PayoutForm = {
  payout_document_number: "",
  payout_mp_email: "",
  payout_bank_cci: "",
};

interface OwnerPayoutSectionProps {
  user: User;
  phone: string;
  onUpdated: () => Promise<void>;
}

export function OwnerPayoutSection({ user, phone, onUpdated }: OwnerPayoutSectionProps) {
  const [form, setForm] = useState<PayoutForm>(emptyForm);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const complete = user.payout_profile_complete === true;
  const missing = user.payout_missing_fields ?? [];

  useEffect(() => {
    setForm({
      payout_document_number: user.payout_document_number ?? "",
      payout_mp_email: user.payout_mp_email ?? "",
      payout_bank_cci: user.payout_bank_cci ?? "",
    });
  }, [user]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);
    try {
      await api.patch<User>("/auth/perfil/", {
        payout_document_number: form.payout_document_number.trim(),
        payout_mp_email: form.payout_mp_email.trim(),
        payout_bank_cci: form.payout_bank_cci.trim(),
      });
      await onUpdated();
      setMsg("Datos de cobro guardados.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card profile-form-card owner-payout-card">
      <h2>Datos para cobrar</h2>
      <p className="muted profile-form-hint">
        Con teléfono y DNI puedes recibir reservas y cobrar directamente al huésped.
        Para cobro en línea dentro de Hospy (Yape, tarjeta), agrega Mercado Pago o tu CCI bancario.
      </p>

      {!complete && (
        <div className="owner-payout-banner" role="status">
          <strong>Faltan datos básicos.</strong>{" "}
          {missing.includes("phone") && "Agrega tu teléfono en el formulario de arriba. "}
          Completa tu DNI para habilitar reservas (incluye pago directo con huéspedes).
        </div>
      )}

      {complete && (
        <p className="success-msg owner-payout-ready">
          Datos básicos completos. Tus hospedajes aceptan reservas.
          {!form.payout_mp_email.trim() && !form.payout_bank_cci.trim() && (
            <>
              {" "}
              Agrega Mercado Pago o CCI para habilitar cobro en línea (Yape/tarjeta).
            </>
          )}
        </p>
      )}

      <form className="profile-form owner-payout-form" onSubmit={save}>
        <label>
          DNI del titular
          <input
            inputMode="numeric"
            maxLength={8}
            value={form.payout_document_number}
            onChange={(e) =>
              setForm({ ...form, payout_document_number: e.target.value.replace(/\D/g, "") })
            }
            placeholder="8 dígitos"
            autoComplete="off"
          />
        </label>
        <label>
          Correo de Mercado Pago (opcional)
          <input
            type="email"
            value={form.payout_mp_email}
            onChange={(e) => setForm({ ...form, payout_mp_email: e.target.value })}
            placeholder="tu@correo.com"
            autoComplete="email"
          />
        </label>
        <label>
          CCI bancario (opcional, alternativa a Mercado Pago)
          <input
            inputMode="numeric"
            maxLength={20}
            value={form.payout_bank_cci}
            onChange={(e) =>
              setForm({ ...form, payout_bank_cci: e.target.value.replace(/\D/g, "") })
            }
            placeholder="20 dígitos"
            autoComplete="off"
          />
        </label>
        {msg && <p className="success-msg">{msg}</p>}
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar datos de cobro"}
        </button>
      </form>

      {!phone.trim() && (
        <p className="muted owner-payout-phone-hint">
          También necesitas un teléfono en{" "}
          <Link to="/perfil">Editar perfil</Link> (sección superior).
        </p>
      )}
    </section>
  );
}
