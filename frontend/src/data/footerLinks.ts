/** Enlaces y datos del footer — actualizar URLs de redes cuando existan cuentas reales. */

export const FOOTER_TAGLINE =
  "El mejor lugar para encontrar hospedajes verificados en Perú";

export const FOOTER_CONTACT = {
  email: "hola@hospy.pe",
  phone: "+51 1 234 5678",
  whatsapp: "https://wa.me/51123456789",
};

export const FOOTER_COMPANY_LINKS = [
  { label: "Sobre nosotros", to: "/sobre-nosotros" },
  { label: "Eventos", to: "/eventos" },
  { label: "Blog", to: "/centro-ayuda" },
  { label: "Trabaja con nosotros", to: "/contacto" },
  { label: "Preguntas frecuentes", to: "/centro-ayuda#faq" },
  { label: "Centro de ayuda", to: "/centro-ayuda" },
  { label: "¿Eres desarrollador?", to: "/desarrolladores" },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { label: "Términos y condiciones", to: "/legal/terminos" },
  { label: "Política de privacidad", to: "/legal/privacidad" },
  { label: "Política de cookies", to: "/legal/cookies" },
  { label: "Aviso legal", to: "/legal/aviso" },
] as const;

export const FOOTER_TRUST = {
  verified: "Hospedajes 100% verificados",
  bestPrice: "Mejor precio garantizado",
  ssl: "Conexión segura",
  complaintsBook: {
    label: "Libro de Reclamaciones",
    href: "https://www.gob.pe/institucion/indecopi/colecciones/libro-de-reclamaciones-virtual",
  },
  safeBooking: "Verificado por SafeBooking",
} as const;

export type FooterSocialId = "facebook" | "instagram" | "x" | "tiktok" | "linkedin";

export const FOOTER_SOCIAL: {
  id: FooterSocialId;
  label: string;
  href: string;
}[] = [
  { id: "facebook", label: "Facebook de Hospy", href: "https://facebook.com/hospy" },
  { id: "instagram", label: "Instagram de Hospy", href: "https://instagram.com/hospy" },
  { id: "x", label: "X (Twitter) de Hospy", href: "https://x.com/hospy" },
  { id: "tiktok", label: "TikTok de Hospy", href: "https://tiktok.com/@hospy" },
  { id: "linkedin", label: "LinkedIn de Hospy", href: "https://linkedin.com/company/hospy" },
];

export const FOOTER_LANGUAGES = [
  { value: "es-PE", label: "Español (Perú)" },
  { value: "en", label: "English" },
] as const;

export const FOOTER_CURRENCIES = [
  { value: "PEN", label: "PEN (S/)" },
  { value: "USD", label: "USD ($)" },
] as const;

export const FOOTER_PAYMENT_METHODS = [
  "Visa",
  "Mastercard",
  "Amex",
  "Yape",
  "Plin",
] as const;
