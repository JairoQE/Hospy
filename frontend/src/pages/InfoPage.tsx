import { Link, useParams } from "react-router-dom";

const LEGAL_CONTENT: Record<string, { title: string; body: string[] }> = {
  terminos: {
    title: "Términos y condiciones",
    body: [
      "Estos términos regulan el uso de la plataforma Hospy. Al registrarse o reservar, acepta las condiciones vigentes.",
      "Los precios y disponibilidad son responsabilidad de cada anfitrión. Hospy actúa como intermediario tecnológico.",
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: [
      "Tratamos sus datos personales conforme a la legislación peruana de protección de datos.",
      "Utilizamos su información para gestionar reservas, comunicaciones y mejorar el servicio.",
    ],
  },
  cookies: {
    title: "Política de cookies",
    body: [
      "Usamos cookies necesarias para el funcionamiento del sitio y, con su consentimiento, cookies analíticas.",
      "Puede configurar sus preferencias desde el enlace «Configuración de cookies» en el pie de página.",
    ],
  },
  aviso: {
    title: "Aviso legal",
    body: [
      "Hospy — plataforma de hospedajes verificados en Perú.",
      "Para consultas legales: hola@hospy.pe",
    ],
  },
};

const STATIC_PAGES: Record<string, { title: string; body: string[] }> = {
  "sobre-nosotros": {
    title: "Sobre nosotros",
    body: [
      "Hospy conecta viajeros con hoteles, hostales y hospedajes verificados en todo el Perú.",
      "Nuestra misión es ofrecer confianza, transparencia y una experiencia de reserva sencilla.",
    ],
  },
  "centro-ayuda": {
    title: "Centro de ayuda",
    body: [
      "Encuentre respuestas sobre reservas, pagos, cancelaciones y su cuenta.",
      "También puede usar a Hospix, el asistente virtual en la esquina de la pantalla.",
      "Sección FAQ: políticas de cancelación, métodos de pago y reseñas.",
    ],
  },
  contacto: {
    title: "Contacto",
    body: [
      "Correo: hola@hospy.pe",
      "Teléfono: +51 1 234 5678",
      "Horario de atención: lunes a viernes, 9:00 – 18:00 (hora de Lima).",
    ],
  },
};

type Props = {
  pageId?: string;
};

export function InfoPage({ pageId }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const key = pageId ?? slug ?? "";

  const page = STATIC_PAGES[key] ?? LEGAL_CONTENT[key];

  if (!page) {
    return (
      <div className="container page">
        <h1>Página no encontrada</h1>
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container page info-page">
      <h1>{page.title}</h1>
      {key === "centro-ayuda" && <h2 id="faq" className="info-page-anchor">Preguntas frecuentes</h2>}
      {page.body.map((p, i) => (
        <p key={`${key}-${i}`}>{p}</p>
      ))}
      <p className="info-page-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </div>
  );
}
