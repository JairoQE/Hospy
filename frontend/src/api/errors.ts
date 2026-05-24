const FIELD_LABELS: Record<string, string> = {
  email: "Correo",
  username: "Usuario",
  password: "Contraseña",
  first_name: "Nombre",
  last_name: "Apellido",
  non_field_errors: "Error",
};

/** Mensaje legible a partir de la respuesta de error de la API. */
export function formatApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "No se pudo completar la solicitud.";
  const obj = data as Record<string, unknown>;

  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.detail)) return obj.detail.map(String).join(" ");

  const parts: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key === "errors") continue;
    const label = FIELD_LABELS[key] ?? key;
    if (Array.isArray(val)) {
      val.forEach((m) => parts.push(`${label}: ${String(m)}`));
    } else if (typeof val === "string") {
      parts.push(`${label}: ${val}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "Revisa los datos del formulario.";
}

/** Errores por campo para mostrar bajo cada input. */
export function parseFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data || typeof data !== "object") return out;

  const obj = data as Record<string, unknown>;
  const source =
    obj.errors && typeof obj.errors === "object"
      ? (obj.errors as Record<string, unknown>)
      : obj;

  for (const [key, val] of Object.entries(source)) {
    if (key === "detail") continue;
    if (Array.isArray(val) && val.length) out[key] = String(val[0]);
    else if (typeof val === "string") out[key] = val;
  }
  return out;
}
