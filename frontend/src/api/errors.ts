const FIELD_LABELS: Record<string, string> = {
  email: "Correo",
  username: "Usuario",
  password: "Contraseña",
  password2: "Repetir contraseña",
  first_name: "Nombre",
  last_name: "Apellido",
  non_field_errors: "General",
  detail: "Error",
};

const MESSAGE_ES: Record<string, string> = {
  "this field is required.": "Este campo es obligatorio.",
  "this field may not be blank.": "Este campo no puede estar vacío.",
  "enter a valid email address.": "Introduce un correo electrónico válido.",
  "this password is too short.": "La contraseña es demasiado corta.",
  "this password is too common.": "Esta contraseña es demasiado común; elige otra más segura.",
  "the password is too similar to the email address.": "La contraseña es muy parecida al correo.",
  "the password is too similar to the first name.": "La contraseña es muy parecida al nombre.",
  "the password is too similar to the last name.": "La contraseña es muy parecida al apellido.",
};

function humanizeMessage(raw: string): string {
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase();
  return MESSAGE_ES[key] ?? trimmed;
}

type CollectedError = { field: string; message: string };

/** Recorre la respuesta DRF (incl. `{ errors: { ... } }`) y extrae mensajes por campo. */
function collectErrors(data: unknown, prefix = ""): CollectedError[] {
  const out: CollectedError[] = [];
  if (data == null) return out;

  if (typeof data === "string") {
    out.push({ field: prefix || "detail", message: humanizeMessage(data) });
    return out;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === "string") {
        out.push({ field: prefix || "detail", message: humanizeMessage(item) });
      } else {
        out.push(...collectErrors(item, prefix));
      }
    }
    return out;
  }

  if (typeof data !== "object") return out;

  const obj = data as Record<string, unknown>;

  if (obj.errors && typeof obj.errors === "object" && obj.errors !== data) {
    out.push(...collectErrors(obj.errors, prefix));
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key === "errors") continue;
    const field = prefix && key !== "non_field_errors" ? key : key;
    if (val == null) continue;
    if (typeof val === "string") {
      out.push({ field, message: humanizeMessage(val) });
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string") {
          out.push({ field, message: humanizeMessage(item) });
        } else {
          out.push(...collectErrors(item, field));
        }
      }
    } else if (typeof val === "object") {
      out.push(...collectErrors(val, field));
    }
  }

  return out;
}

/** Mensaje legible a partir de la respuesta de error de la API. */
export function formatApiError(data: unknown): string {
  const items = collectErrors(data);
  if (items.length === 0) {
    return "No se pudo completar la solicitud. Comprueba los datos e inténtalo de nuevo.";
  }

  const parts = items.map(({ field, message }) => {
    const label = FIELD_LABELS[field] ?? field;
    if (field === "detail" || field === "non_field_errors") {
      return message;
    }
    return `${label}: ${message}`;
  });

  return parts.join(" · ");
}

/** Errores por campo para mostrar bajo cada input. */
export function parseFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { field, message } of collectErrors(data)) {
    if (field === "detail" || field === "non_field_errors") continue;
    if (!out[field]) out[field] = message;
  }
  return out;
}
