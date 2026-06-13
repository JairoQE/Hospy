import {
  FAQ_ENTRIES,
  MOCK_STAYS,
  guestQuickActions,
  ownerQuickActions,
  welcomeMessage,
} from "../data/chatFlows";
import { isPageLocationQuestion, replyPageLocation } from "../utils/pageContext";
import type { HospixContext, HospixFlowState, HospixTurnResult } from "../types/hospix";

function filterStays(city: string): typeof MOCK_STAYS {
  const q = city.toLowerCase();
  const filtered = MOCK_STAYS.filter(
    (s) => s.location.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  );
  return filtered.length > 0 ? filtered : MOCK_STAYS;
}

function matchFaq(text: string): string | null {
  const t = text.toLowerCase();
  for (const entry of FAQ_ENTRIES) {
    if (entry.keys.some((k) => t.includes(k))) return entry.answer;
  }
  return null;
}

function initialState(): HospixFlowState {
  return { flowId: null, step: 0, data: {} };
}

export function getWelcomeReplies(ctx: HospixContext): HospixTurnResult {
  const w = welcomeMessage(ctx);
  return {
    replies: [
      {
        role: "hospix",
        text: w.text,
        actions: w.actions,
      },
    ],
    nextState: initialState(),
  };
}

export function processUserInput(
  text: string,
  state: HospixFlowState,
  ctx: HospixContext,
): HospixTurnResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { replies: [], nextState: state };
  }

  const lower = trimmed.toLowerCase();

  if (isPageLocationQuestion(trimmed)) {
    return {
      replies: [
        {
          role: "hospix",
          markdown: replyPageLocation(ctx.pathname, ctx.formalTone),
          actions: [{ id: "home", label: "Ir al inicio", type: "navigate", target: "/" }],
        },
      ],
      nextState: initialState(),
    };
  }

  if (state.flowId === "search_stay") {
    return handleSearchFlow(trimmed, state, ctx);
  }
  if (state.flowId === "booking_status") {
    return handleBookingFlow(trimmed, state);
  }
  if (state.flowId === "report_issue") {
    return handleReportFlow(trimmed, state, ctx);
  }
  if (state.flowId === "faq") {
    const ans = matchFaq(trimmed);
    return {
      replies: [
        {
          role: "hospix",
          markdown: ans ?? "No encontré esa respuesta exacta. Prueba con: cancelación, pago, reseña o check-in.",
          chips: guestQuickActions(ctx.isAuthenticated).slice(0, 3),
        },
      ],
      nextState: { flowId: "faq", step: 0, data: {} },
    };
  }

  if (/buscar|hospedaje|alojamiento|reservar|hotel|hostal/.test(lower)) {
    return startSearchFlow(ctx);
  }
  if (/reserva|reservas|estado|confirmación/.test(lower) && ctx.isAuthenticated) {
    return startBookingFlow();
  }
  if (/panel|ocupación|ocupacion|estadística|estadistica|propietario/.test(lower)) {
    if (ctx.audience === "propietario") return ownerSummaryReply();
  }
  if (/cusco|lima|arequipa|piura|trujillo|iquitos|huánuco|huanuco/.test(lower)) {
    const city = trimmed.match(
      /cusco|lima|arequipa|piura|trujillo|iquitos|huánuco|huanuco/i,
    )?.[0];
    if (city) {
      return showSearchResults(city, { flowId: "search_stay", step: 2, data: { city } }, ctx);
    }
  }

  const faq = matchFaq(trimmed);
  if (faq) {
    return {
      replies: [{ role: "hospix", markdown: faq, chips: suggestChips(ctx) }],
      nextState: initialState(),
    };
  }

  const you = ctx.formalTone ? "¿En qué más puedo ayudarle?" : "¿En qué más puedo ayudarte?";
  return {
    replies: [
      {
        role: "hospix",
        text: `Entiendo. ${you} Puedo ayudarte a buscar hospedaje, revisar reservas o responder preguntas frecuentes.`,
        actions: ctx.audience === "propietario" ? ownerQuickActions() : guestQuickActions(ctx.isAuthenticated),
      },
    ],
    nextState: initialState(),
  };
}

export function processAction(
  actionId: string,
  target: string | undefined,
  _state: HospixFlowState,
  ctx: HospixContext,
): HospixTurnResult | "navigate" | null {
  if (actionId === "retry") {
    return getWelcomeReplies(ctx);
  }

  const flowTarget = target ?? actionId;

  switch (flowTarget) {
    case "search_stay":
      return startSearchFlow(ctx);
    case "booking_status":
      return startBookingFlow();
    case "owner_summary":
      return ownerSummaryReply();
    case "report_issue":
      return {
        replies: [
          {
            role: "hospix",
            text: ctx.formalTone
              ? "Describa el problema (huésped, plataforma o pago). Lo registraré como incidencia."
              : "Cuéntame el problema (huésped, plataforma o pago) y lo registro como incidencia.",
          },
        ],
        nextState: { flowId: "report_issue", step: 0, data: {} },
      };
    case "faq":
      return {
        replies: [
          {
            role: "hospix",
            markdown:
              "Preguntas frecuentes: **cancelación**, **pago**, **reseñas**, **check-in**, **mascotas**, **WiFi**, **verificación**, **propietarios**.",
            chips: [
              { id: "c1", label: "Cancelar reserva", type: "send", message: "¿Cómo cancelo una reserva?" },
              { id: "c2", label: "Métodos de pago", type: "send", message: "¿Cómo funciona el pago?" },
              { id: "c3", label: "Dejar reseña", type: "send", message: "¿Cómo dejo una reseña?" },
            ],
          },
        ],
        nextState: { flowId: "faq", step: 0, data: {} },
      };
    default:
      return null;
  }
}

function suggestChips(ctx: HospixContext) {
  return (ctx.audience === "propietario" ? ownerQuickActions() : guestQuickActions(ctx.isAuthenticated)).slice(
    0,
    3,
  );
}

function startSearchFlow(ctx: HospixContext): HospixTurnResult {
  return {
    replies: [
      {
        role: "hospix",
        text: ctx.formalTone
          ? "¿Qué ciudad o distrito busca?"
          : "¿Qué ciudad o barrio buscas? 🔍",
        chips: [
          { id: "geo", label: "Usar mi ubicación", type: "send", message: "Buscar cerca de mi ubicación" },
          { id: "cusco", label: "Cusco", type: "send", message: "Quiero hospedaje en Cusco" },
          { id: "lima", label: "Lima", type: "send", message: "Quiero hospedaje en Lima" },
        ],
      },
    ],
    nextState: { flowId: "search_stay", step: 0, data: {} },
  };
}

function handleSearchFlow(
  text: string,
  state: HospixFlowState,
  ctx: HospixContext,
): HospixTurnResult {
  if (state.step === 0) {
    const city =
      text.toLowerCase().includes("ubicación") || text.toLowerCase().includes("ubicacion")
        ? "Lima"
        : text;
    return {
      replies: [
        {
          role: "hospix",
          text: ctx.formalTone
            ? `Perfecto, **${city}**. ¿Para cuántas personas y qué fechas aproximadas? (ej: 2 personas, 10-15 junio)`
            : `¡Genial! **${city}**. ¿Para cuántas personas y qué fechas? (ej: 2 personas, 10-15 junio)`,
        },
      ],
      nextState: { flowId: "search_stay", step: 1, data: { city } },
    };
  }
  if (state.step === 1) {
    const city = state.data.city ?? "Perú";
    return showSearchResults(city, { flowId: "search_stay", step: 2, data: { ...state.data, dates: text } }, ctx);
  }
  return showSearchResults(state.data.city ?? "Cusco", state, ctx);
}

function showSearchResults(
  city: string,
  state: HospixFlowState,
  ctx: HospixContext,
): HospixTurnResult {
  const cards = filterStays(city);
  return {
    replies: [
      {
        role: "hospix",
        text: ctx.formalTone
          ? `Opciones destacadas en **${city}**:`
          : `¡Claro! Te muestro opciones destacadas en **${city}** ✅`,
        cards,
        chips: [
          { id: "more", label: "Ver más en el buscador", type: "navigate", target: `/?ciudad=${encodeURIComponent(city)}` },
          { id: "again", label: "Otra ciudad", type: "flow", target: "search_stay" },
        ],
      },
    ],
    nextState: state,
  };
}

function startBookingFlow(): HospixTurnResult {
  return {
    replies: [
      {
        role: "hospix",
        text: "Indícame tu **número de reserva** o el **correo** con el que reservaste.",
      },
    ],
    nextState: { flowId: "booking_status", step: 0, data: {} },
  };
}

function handleBookingFlow(text: string, _state: HospixFlowState): HospixTurnResult {
  const ref = text.replace(/\s/g, "").slice(0, 12);
  return {
    replies: [
      {
        role: "hospix",
        markdown: `Reserva asociada a **${ref}** (demo):\n- Estado: **Confirmada**\n- Check-in: 10 jun 2026\n- Check-out: 12 jun 2026\n- Total: **S/ 360**`,
        actions: [
          { id: "go-bookings", label: "Ver en Mis reservas", type: "navigate", target: "/mis-reservas" },
          { id: "contact", label: "Contactar anfitrión", type: "navigate", target: "/bandeja" },
          { id: "cancel", label: "Política de cancelación", type: "send", message: "¿Cómo cancelo una reserva?" },
        ],
      },
    ],
    nextState: { flowId: null, step: 0, data: {} },
  };
}

function ownerSummaryReply(): HospixTurnResult {
  return {
    replies: [
      {
        role: "hospix",
        markdown:
          "Resumen rápido de su panel (demo):\n- **3** reservas pendientes esta semana\n- Ocupación actual: **68%**\n- Calificación promedio: **4.8**",
        actions: [
          { id: "panel", label: "Ver detalles", type: "navigate", target: "/panel" },
          { id: "reservas", label: "Ver reservas", type: "navigate", target: "/panel" },
        ],
        chips: [
          { id: "edit", label: "Editar hospedaje", type: "navigate", target: "/panel" },
          { id: "report", label: "Reportar incidencia", type: "flow", target: "report_issue" },
        ],
      },
    ],
    nextState: { flowId: null, step: 0, data: {} },
  };
}

function handleReportFlow(
  text: string,
  state: HospixFlowState,
  ctx: HospixContext,
): HospixTurnResult {
  if (state.step === 0) {
    return {
      replies: [
        {
          role: "hospix",
          text: ctx.formalTone
            ? `Gracias. Registré su incidencia: «${text.slice(0, 80)}…». El equipo revisará en 24-48 h.`
            : `Gracias ✅ Registré tu incidencia. El equipo la revisará en 24-48 h.`,
          actions: [{ id: "inbox", label: "Ir a Bandeja", type: "navigate", target: "/bandeja" }],
        },
      ],
      nextState: { flowId: null, step: 0, data: { ticket: text } },
    };
  }
  return ownerSummaryReply();
}

/** Simula latencia de red / IA. */
export function simulateReplyDelay(textLength: number): number {
  return Math.min(1400, 500 + textLength * 8);
}
