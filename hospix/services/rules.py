"""Motor conversacional por reglas + datos reales de Hospy."""

from __future__ import annotations

import re
import uuid

from .context import (
    build_platform_snippet,
    build_user_snippet,
    extract_stay_types,
    formal_tone,
    is_country_scope,
    match_faq,
    resolve_audience,
    search_stays,
    stay_types_phrase,
)
from .page_context import is_page_location_question, reply_page_location

PERU_CITIES = [
    "lima",
    "cusco",
    "cuzco",
    "arequipa",
    "piura",
    "trujillo",
    "iquitos",
    "huánuco",
    "huanuco",
    "miraflores",
    "cajamarca",
    "puno",
    "ica",
    "chiclayo",
]


def _reply(**kwargs) -> dict:
    return {"role": "hospix", **kwargs}


def _actions_guest(logged_in: bool) -> list[dict]:
    base = [
        {"id": "search", "label": "🔍 Buscar hospedaje", "type": "flow", "target": "search_stay"},
        {"id": "faq", "label": "❓ Preguntas frecuentes", "type": "flow", "target": "faq"},
    ]
    if logged_in:
        base.insert(
            1,
            {"id": "bookings", "label": "📅 Mis reservas", "type": "navigate", "target": "/mis-reservas"},
        )
        base.insert(
            2,
            {"id": "inbox", "label": "💬 Consultas", "type": "navigate", "target": "/bandeja"},
        )
    else:
        base.append({"id": "login", "label": "🔑 Iniciar sesión", "type": "navigate", "target": "/login"})
    return base


def _actions_owner() -> list[dict]:
    return [
        {"id": "owner-summary", "label": "📊 Resumen del panel", "type": "flow", "target": "owner_summary"},
        {"id": "panel", "label": "🏠 Mis hospedajes", "type": "navigate", "target": "/panel"},
        {"id": "report", "label": "🛠️ Reportar incidencia", "type": "flow", "target": "report_issue"},
    ]


def welcome_replies(user, pathname: str) -> tuple[list[dict], dict]:
    audience = resolve_audience(user, pathname)
    formal = formal_tone(audience)
    name = ""
    if user and user.is_authenticated:
        name = (user.first_name or "").strip()
        if name:
            name = f", {name}"

    if audience == "propietario":
        text = (
            f"✨ ¡Buenos días{name}! Soy **Hospix**, su asistente en Hospy. "
            "¿Necesita un resumen del panel, ayuda con sus hospedajes o reportar una incidencia?"
        )
    elif audience == "admin":
        text = (
            f"✨ Hola{name}. Soy **Hospix**. Le ayudo con accesos rápidos al panel de administración."
        )
    else:
        text = (
            f"✨ ¡Hola{name}! Soy **Hospix**, tu guía en Hospy. "
            "¿Buscas hospedaje, tienes dudas sobre una reserva o tu cuenta?"
        )

    return [_reply(markdown=text)], _empty_state()


def _empty_state() -> dict:
    return {"flow_id": None, "flow_step": 0, "flow_data": {}}


def _extract_city(text: str) -> str | None:
    lower = text.lower()
    for c in PERU_CITIES:
        if c in lower:
            return "Huánuco" if c == "huanuco" else c.capitalize()
    m = re.search(
        r"(?:en|para|hacia|buscar en|quiero ir a)\s+([a-záéíóúñü\s]{3,40})",
        lower,
        re.I,
    )
    if m:
        return m.group(1).strip().title()
    return None


def process_message(
    *,
    message: str,
    user,
    pathname: str,
    flow_state: dict,
    ip_city: str | None = None,
) -> tuple[list[dict], dict, str | None]:
    """Devuelve (replies, next_state, session_id)."""
    audience = resolve_audience(user, pathname)
    formal = formal_tone(audience)
    logged_in = bool(user and user.is_authenticated)
    text = (message or "").strip()
    state = {
        "flow_id": flow_state.get("flow_id"),
        "flow_step": int(flow_state.get("flow_step") or 0),
        "flow_data": dict(flow_state.get("flow_data") or {}),
    }

    if not text:
        return [], state, None

    if is_page_location_question(text):
        actions = [{"id": "home", "label": "Ir al inicio", "type": "navigate", "target": "/"}]
        return (
            [_reply(markdown=reply_page_location(pathname, formal), actions=actions)],
            _empty_state(),
            None,
        )

    lower = text.lower()
    flow_id = state["flow_id"]
    step = state["flow_step"]

    if flow_id == "search_stay":
        return _flow_search(text, state, formal, logged_in, ip_city=ip_city)
    if flow_id == "booking_status":
        return _flow_booking(text, logged_in)
    if flow_id == "report_issue":
        return _flow_report(text, formal)
    if flow_id == "faq":
        ans = match_faq(text)
        return (
            [
                _reply(
                    markdown=ans
                    or "Prueba preguntar por: cancelación, pago, reseñas o check-in.",
                    chips=_actions_guest(logged_in)[:3],
                )
            ],
            state,
            None,
        )

    city = _extract_city(text)
    if not city and ip_city and re.search(
        r"buscar|hospedaje|alojamiento|reservar|hotel|hostal|barato|económico|economico",
        lower,
    ):
        city = ip_city
    if city:
        return _show_city_results(city, state, formal, message=text)

    if re.search(r"buscar|hospedaje|alojamiento|reservar|hotel|hostal", lower):
        return _start_search(formal)

    if re.search(r"reserva|reservas|estado|confirmación|confirmacion", lower) and logged_in:
        return _start_booking()

    if re.search(r"panel|ocupación|ocupacion|estadística|propietario", lower) and audience == "propietario":
        return _owner_summary(user)

    faq = match_faq(text)
    if faq:
        return [_reply(markdown=faq, chips=_actions_guest(logged_in)[:3])], _empty_state(), None

    if re.search(
        r"^(hola|holaa|hey|hi|buenos días|buenos dias|buenas tardes|buenas noches|buen día|buen dia|qué tal|que tal)\b",
        lower,
    ):
        return _greeting_reply(user, audience, formal, logged_in)

    conv = _conversational_reply(text, audience, formal)
    if conv:
        return conv, _empty_state(), None

    you = "¿En qué más puedo ayudarle?" if formal else "¿En qué más puedo ayudarte?"
    return [
        _reply(
            markdown=(
                f"{you} Cuéntame qué necesitas: buscar hospedaje, una reserva, "
                "o cualquier duda sobre Hospy."
            ),
        )
    ], _empty_state(), None


def _conversational_reply(text: str, audience: str, formal: bool):
    """Respuestas libres en texto para charla general (sin menús)."""
    lower = text.lower()
    if re.search(
        r"(quién eres|quien eres|qué eres|que eres|cuéntame acerca|cuentame acerca|"
        r"hablame de ti|háblame de ti|preséntate|presentate|qué es hospix|que es hospix)",
        lower,
    ):
        if formal:
            md = (
                "Soy **Hospix**, el asistente virtual de **Hospy**. "
                "Le ayudo a buscar hospedajes verificados en Perú, entender reservas y resolver dudas de la plataforma. "
                "No soy una persona, pero conversamos por texto como en un chat. ¿Qué le gustaría saber?"
            )
        else:
            md = (
                "Soy **Hospix**, el asistente de **Hospy** 😊 "
                "Estoy para ayudarte a encontrar hospedajes en Perú, aclarar temas de reservas y orientarte en la plataforma. "
                "No soy humano, pero puedes escribirme con naturalidad. ¿Qué te gustaría hacer o saber?"
            )
        return [_reply(markdown=md)]

    if re.search(r"\b(gracias|muchas gracias|te agradezco|genial|perfecto|ok|vale)\b", lower):
        md = (
            "De nada. Estoy aquí cuando lo necesite."
            if formal
            else "¡De nada! 😊 Cuando quieras, seguimos."
        )
        return [_reply(markdown=md)]

    if re.search(r"(qué puedes hacer|que puedes hacer|en qué ayudas|como funciona|cómo funciona)", lower):
        if formal:
            md = (
                "Puedo orientarle sobre hospedajes en Hospy, reservas, pagos, cancelaciones y el panel de propietarios. "
                "Escríbame su duda concreta y le respondo en este chat."
            )
        else:
            md = (
                "Puedo charlar contigo y ayudarte con lo que necesites en Hospy: "
                "buscar dónde hospedarte, entender una reserva, dudas de pago o cancelación, o el panel si eres propietario. "
                "¿Qué te interesa?"
            )
        return [_reply(markdown=md)]

    return None


def _greeting_reply(user, audience: str, formal: bool, logged_in: bool):
    name = ""
    if user and user.is_authenticated:
        name = (getattr(user, "first_name", "") or "").strip()
        if name:
            name = f", {name}"

    if audience == "propietario":
        text = (
            f"¡Buenos días{name}! ¿Le ayudo con su panel, reservas pendientes o una incidencia?"
            if formal
            else f"¡Hola{name}! ¿Revisamos tu panel o tienes alguna consulta de propietario?"
        )
    elif audience == "admin":
        text = f"¡Hola{name}! ¿Necesita acceso rápido al panel de administración?"
    else:
        text = (
            f"¡Hola{name}! 👋 Soy **Hospix**. ¿Buscas hospedaje, tienes dudas de una reserva o quieres crear tu cuenta?"
            if not formal
            else f"¡Buenos días{name}! Soy **Hospix**. ¿Desea buscar hospedaje o consultar sus reservas?"
        )

    return [_reply(markdown=text)], _empty_state(), None


def process_action(action_id: str, target: str | None, user, pathname: str, flow_state: dict):
    key = target or action_id
    if key == "search_stay":
        return process_message(message="buscar", user=user, pathname=pathname, flow_state=_empty_state())
    if key == "booking_status":
        return _start_booking()
    if key == "owner_summary":
        return _owner_summary(user)
    if key == "report_issue":
        audience = resolve_audience(user, pathname)
        formal = formal_tone(audience)
        return (
            [
                _reply(
                    markdown=(
                        "Describa el problema (huésped, plataforma o pago)."
                        if formal
                        else "Cuéntame el problema y lo registro como incidencia."
                    )
                )
            ],
            {"flow_id": "report_issue", "flow_step": 0, "flow_data": {}},
            None,
        )
    if key == "faq":
        return (
            [
                _reply(
                    markdown="Preguntas frecuentes: **cancelación**, **pago**, **reseñas**, **check-in**, **mascotas**.",
                    chips=[
                        {"id": "c1", "label": "Cancelar", "type": "send", "message": "¿Cómo cancelo?"},
                        {"id": "c2", "label": "Pagos", "type": "send", "message": "¿Cómo funciona el pago?"},
                    ],
                )
            ],
            {"flow_id": "faq", "flow_step": 0, "flow_data": {}},
            None,
        )
    return None


def _start_search(formal: bool):
    return (
        [
            _reply(
                markdown=(
                    "¿Qué ciudad o distrito busca?"
                    if formal
                    else "¿Qué ciudad o barrio buscas? 🔍"
                ),
                chips=[
                    {"id": "cusco", "label": "Cusco", "type": "send", "message": "Hospedaje en Cusco"},
                    {"id": "lima", "label": "Lima", "type": "send", "message": "Hospedaje en Lima"},
                ],
            )
        ],
        {"flow_id": "search_stay", "flow_step": 0, "flow_data": {}},
        None,
    )


def _flow_search(text: str, state: dict, formal: bool, logged_in: bool, ip_city: str | None = None):
    step = state["flow_step"]
    if step == 0:
        city = _extract_city(text) or ip_city or text
        state["flow_data"]["city"] = city
        state["flow_step"] = 1
        return (
            [
                _reply(
                    markdown=(
                        f"Perfecto, **{city}**. ¿Para cuántas personas y fechas aproximadas?"
                        if formal
                        else f"¡Genial! **{city}**. ¿Cuántas personas y qué fechas tienes en mente?"
                    )
                )
            ],
            state,
            None,
        )
    city = state["flow_data"].get("city") or _extract_city(text) or "Lima"
    return _show_city_results(city, state, formal, message=text)


def _show_city_results(city: str, state: dict, formal: bool, message: str = ""):
    types = extract_stay_types(message)
    phrase = stay_types_phrase(types)
    country = is_country_scope(city, message)
    limit = 10 if country else 3
    cards = search_stays(city, limit=limit, message=message)
    place_label = "todo **Perú**" if country else f"**{city}**"
    if not cards:
        return (
            [
                _reply(
                    markdown=(
                        f"No encontré {phrase} activos en {place_label} ahora mismo. "
                        "Prueba una ciudad concreta (ej. Lima, Cusco) o explora el buscador principal."
                    ),
                    actions=[
                        {"id": "home", "label": "Ir al buscador", "type": "navigate", "target": "/"},
                    ],
                )
            ],
            _empty_state(),
            None,
        )
    intro = (
        f"Te muestro **{len(cards)}** {phrase} verificados en {place_label} ✅"
        if not formal
        else f"Opciones de **{phrase}** en Hospy ({place_label}):"
    )
    return (
        [
            _reply(
                markdown=intro,
                cards=cards,
                actions=[
                    {
                        "id": "more",
                        "label": "Ver más en buscador",
                        "type": "navigate",
                        "target": f"/?ciudad={city}",
                    },
                ],
            )
        ],
        {"flow_id": None, "flow_step": 0, "flow_data": {"city": city}},
        None,
    )


def _start_booking():
    return (
        [_reply(markdown="Indícame tu **número de reserva** o el **correo** con el que reservaste.")],
        {"flow_id": "booking_status", "flow_step": 0, "flow_data": {}},
        None,
    )


def _flow_booking(text: str, logged_in: bool):
    from bookings.models import Booking

    ref = text.strip()
    booking = None
    if ref.isdigit():
        booking = Booking.objects.filter(pk=int(ref)).select_related("room__accommodation").first()
    if not booking and "@" in ref:
        booking = (
            Booking.objects.filter(guest__email__iexact=ref)
            .select_related("room__accommodation")
            .order_by("-created_at")
            .first()
        )

    if booking:
        acc = booking.room.accommodation
        md = (
            f"Reserva **#{booking.pk}** — {acc.name}\n"
            f"- Estado: **{booking.get_status_display()}**\n"
            f"- {booking.check_in} → {booking.check_out}\n"
            f"- Total: **S/ {booking.total_amount}**"
        )
        return (
            [
                _reply(
                    markdown=md,
                    actions=[
                        {"id": "go", "label": "Mis reservas", "type": "navigate", "target": "/mis-reservas"},
                    ],
                )
            ],
            _empty_state(),
            None,
        )

    return (
        [
            _reply(
                markdown=(
                    "No encontré esa reserva. Revisa el número en **Mis reservas** "
                    "o usa el correo exacto con el que registraste."
                ),
                actions=[
                    {"id": "bookings", "label": "Mis reservas", "type": "navigate", "target": "/mis-reservas"},
                ]
                if logged_in
                else [],
            )
        ],
        _empty_state(),
        None,
    )


def _owner_summary(user):
    from bookings.models import Booking
    from properties.models import Accommodation

    if not user or not user.is_authenticated:
        return (
            [_reply(markdown="Inicie sesión como propietario para ver su resumen.")],
            _empty_state(),
            None,
        )

    acc_count = Accommodation.objects.filter(
        owner=user, is_deleted=False, status=Accommodation.Status.APROBADO
    ).count()
    pending = Booking.objects.filter(
        room__accommodation__owner=user, status=Booking.Status.PENDIENTE
    ).count()
    return (
        [
            _reply(
                markdown=(
                    f"Resumen de su panel:\n"
                    f"- **{acc_count}** hospedaje(s) activo(s)\n"
                    f"- **{pending}** reserva(s) pendiente(s) de revisar"
                ),
                actions=[{"id": "panel", "label": "Ver panel", "type": "navigate", "target": "/panel"}],
            )
        ],
        _empty_state(),
        None,
    )


def _flow_report(text: str, formal: bool):
    return (
        [
            _reply(
                markdown=(
                    f"Gracias. Registré su incidencia: «{text[:120]}». El equipo la revisará en 24-48 h."
                    if formal
                    else f"Gracias ✅ Registré tu incidencia. Te contactaremos si hace falta."
                ),
                actions=[{"id": "inbox", "label": "Bandeja", "type": "navigate", "target": "/bandeja"}],
            )
        ],
        _empty_state(),
        None,
    )


def llm_to_replies(data: dict) -> list[dict]:
    if not data:
        return []
    markdown = (data.get("markdown") or data.get("text") or "").strip()
    if not markdown:
        return []

    kwargs: dict = {"markdown": markdown}
    actions = data.get("actions") or []
    chips = data.get("chips") or []
    cards = data.get("cards") or []
    if actions:
        kwargs["actions"] = actions
    if chips:
        kwargs["chips"] = chips
    if cards:
        kwargs["cards"] = cards
    return [_reply(**kwargs)]


def new_session_id() -> str:
    return str(uuid.uuid4())
