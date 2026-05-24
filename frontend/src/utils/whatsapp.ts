/** Normaliza teléfono peruano para enlace wa.me (solo dígitos, con código país). */
export function normalizePhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("51") && digits.length >= 10) return digits;
  if (digits.length === 9) return `51${digits}`;
  if (digits.length >= 10) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
