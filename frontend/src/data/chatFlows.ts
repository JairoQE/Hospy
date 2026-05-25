import type { HospixAction, HospixCard, HospixContext } from "../types/hospix";

/** Hospedajes mock para demostración de búsqueda. */
export const MOCK_STAYS: HospixCard[] = [
  {
    id: "casa-montana",
    name: "Casa de la Montaña",
    location: "Cusco, Perú",
    price: "S/ 180 / noche",
    link: "/?ciudad=Cusco",
  },
  {
    id: "apto-centro",
    name: "Apartamento Centro",
    location: "Lima, Miraflores",
    price: "S/ 220 / noche",
    link: "/?ciudad=Lima",
  },
  {
    id: "hostal-viajero",
    name: "Hostal El Viajero",
    location: "Arequipa, Perú",
    price: "S/ 95 / noche",
    link: "/?ciudad=Arequipa",
  },
];

export const FAQ_ENTRIES: { keys: string[]; answer: string }[] = [
  {
    keys: ["cancelar", "cancelación", "cancelacion", "reembolso"],
    answer:
      "Puedes cancelar desde **Mis reservas** si la política del hospedaje lo permite. Las cancelaciones gratuitas suelen aplicar hasta 48 h antes del check-in.",
  },
  {
    keys: ["pago", "pagar", "tarjeta", "yape", "plin"],
    answer:
      "Hospy confirma la reserva en la plataforma. El pago al anfitrión depende de cada hospedaje (transferencia, efectivo en check-in, etc.). Revisa el detalle antes de confirmar.",
  },
  {
    keys: ["reseña", "resena", "valorar", "calificar"],
    answer:
      "Tras una estadía **completada**, entra a **Mis reservas** y pulsa «Dejar reseña». Tu opinión ayuda a otros viajeros.",
  },
  {
    keys: ["check-in", "checkin", "entrada", "llegada"],
    answer:
      "El check-in habitual es desde las **13:00**. El anfitrión te envía instrucciones por mensaje una vez confirmada la reserva.",
  },
  {
    keys: ["mascota", "mascotas", "perro", "gato"],
    answer:
      "Filtra hospedajes que indiquen «mascotas permitidas» en la ficha o pregunta al anfitrión desde la página del alojamiento.",
  },
  {
    keys: ["wifi", "internet"],
    answer: "La mayoría de hospedajes en Hospy incluyen WiFi. Lo verás en servicios de cada ficha.",
  },
  {
    keys: ["verificar", "verificado", "confianza"],
    answer:
      "Los hospedajes **verificados** pasan revisión del equipo Hospy. Busca el distintivo verde en la tarjeta del listado.",
  },
  {
    keys: ["propietario", "publicar", "anunciar", "registrar hospedaje"],
    answer:
      "Regístrate como propietario en **Registro propietario**. Tras la aprobación, usa **Mi panel** para crear tu ficha.",
  },
  {
    keys: ["contacto", "soporte", "ayuda humana"],
    answer:
      "Para un caso especial, abre **Bandeja** o describe el problema aquí y te guío a la sección correcta.",
  },
  {
    keys: ["ubicacion", "ubicación", "mapa", "como llegar"],
    answer:
      "En cada hospedaje hay mapa y dirección. También puedes usar «Preguntar al anfitrión» antes de reservar.",
  },
];

export function welcomeMessage(ctx: HospixContext): {
  text: string;
  actions: HospixAction[];
} {
  const name = ctx.userName ? `, ${ctx.userName.split(" ")[0]}` : "";
  if (ctx.audience === "propietario") {
    return {
      text: `✨ ¡Buenos días${name}! Soy **Hospix**, su asistente en Hospy. ¿Necesita un resumen del panel, ayuda con sus hospedajes o reportar una incidencia?`,
      actions: ownerQuickActions(),
    };
  }
  if (ctx.audience === "admin") {
    return {
      text: `✨ Hola${name}. Soy **Hospix**. En el panel de administración puede usar las secciones del menú lateral; aquí le ayudo con accesos rápidos.`,
      actions: [
        { id: "go-admin", label: "Panel admin", type: "navigate", target: "/admin" },
        { id: "go-moderacion", label: "Hospedajes", type: "navigate", target: "/admin/moderacion" },
        { id: "faq", label: "Preguntas frecuentes", type: "flow", target: "faq" },
      ],
    };
  }
  return {
    text: `✨ ¡Hola${name}! Soy **Hospix**, tu guía digital en Hospy. ¿Buscas hospedaje, tienes dudas sobre una reserva o necesitas ayuda con tu cuenta?`,
    actions: guestQuickActions(ctx.isAuthenticated),
  };
}

export function guestQuickActions(loggedIn: boolean): HospixAction[] {
  const base: HospixAction[] = [
    { id: "search", label: "🔍 Buscar hospedaje", type: "flow", target: "search_stay" },
    { id: "faq", label: "❓ Preguntas frecuentes", type: "flow", target: "faq" },
  ];
  if (loggedIn) {
    base.splice(1, 0, {
      id: "bookings",
      label: "📅 Mis reservas",
      type: "navigate",
      target: "/mis-reservas",
    });
    base.splice(2, 0, {
      id: "inbox",
      label: "💬 Consultas activas",
      type: "navigate",
      target: "/bandeja",
    });
  } else {
    base.push({ id: "login", label: "🔑 Iniciar sesión", type: "navigate", target: "/login" });
  }
  return base;
}

export function ownerQuickActions(): HospixAction[] {
  return [
    { id: "owner-summary", label: "📊 Resumen del panel", type: "flow", target: "owner_summary" },
    { id: "owner-listings", label: "🏠 Mis hospedajes", type: "navigate", target: "/panel" },
    { id: "owner-edit", label: "✏️ Editar ficha", type: "navigate", target: "/panel" },
    { id: "owner-report", label: "🛠️ Reportar incidencia", type: "flow", target: "report_issue" },
  ];
}

export function proactiveHint(ctx: HospixContext): string | null {
  if (ctx.inboxUnread > 0) {
    return `Tiene **${ctx.inboxUnread}** consulta(s) sin leer en su bandeja. ¿Desea abrirlas?`;
  }
  return null;
}
