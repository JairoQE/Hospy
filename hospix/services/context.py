"""Contexto de usuario y plataforma para Hospix."""

from __future__ import annotations

import json
import re

from django.db.models import Min, Q

from hospix.faq_data import FAQ_ENTRIES

from bookings.models import Booking
from properties.media_urls import media_public_path
from properties.models import Accommodation
from properties.geography import expand_free_text_location_to_cities
from rooms.models import Room


def _primary_photo_url(accommodation: Accommodation) -> str | None:
    foto = (
        accommodation.fotos.filter(is_primary=True).first()
        or accommodation.fotos.order_by("order", "id").first()
    )
    if not foto or not foto.image:
        return None
    return media_public_path(foto.image)


def resolve_audience(user, pathname: str) -> str:
    if not user or not user.is_authenticated:
        return "guest"
    role = getattr(user, "role", "huesped")
    if pathname.startswith("/admin") or role == "administrador":
        return "admin"
    if role == "propietario":
        return "propietario"
    return "huesped"


def formal_tone(audience: str) -> bool:
    return audience in ("propietario", "admin")


def build_platform_snippet() -> str:
    return (
        "Hospy es una plataforma peruana de hoteles, hostales y hospedajes verificados. "
        "Los huéspedes buscan y reservan; los propietarios gestionan fichas y reservas en el panel."
    )


def build_user_snippet(user, audience: str) -> str:
    if not user or not user.is_authenticated:
        return "Usuario invitado (no ha iniciado sesión)."

    name = f"{user.first_name} {user.last_name}".strip() or user.email
    parts = [f"Usuario autenticado: {name} ({user.email}), rol: {audience}."]

    if audience == "huesped":
        bookings = Booking.objects.filter(guest=user).order_by("-created_at")[:5]
        if bookings:
            lines = []
            for b in bookings:
                acc = b.room.accommodation
                lines.append(
                    f"- Reserva #{b.pk}: {acc.name}, {b.status}, "
                    f"{b.check_in} → {b.check_out}, S/ {b.total_amount}"
                )
            parts.append("Reservas recientes del huésped:\n" + "\n".join(lines))
        else:
            parts.append("El huésped aún no tiene reservas registradas.")

    elif audience == "propietario":
        accs = Accommodation.objects.filter(
            owner=user, is_deleted=False, status=Accommodation.Status.APROBADO
        )
        acc_count = accs.count()
        pending = Booking.objects.filter(
            room__accommodation__owner=user,
            status=Booking.Status.PENDIENTE,
        ).count()
        parts.append(
            f"Propietario con {acc_count} hospedaje(s) aprobado(s). "
            f"Reservas pendientes de revisar: {pending}."
        )

    return "\n".join(parts)


TYPE_LABELS = {
    Accommodation.Type.HOTEL: "Hotel",
    Accommodation.Type.HOSTAL: "Hostal",
    Accommodation.Type.HOSPEDAJE: "Hospedaje",
    Accommodation.Type.CASA_DEPARTAMENTO: "Casa o departamento",
}


def extract_stay_types(text: str) -> list[str] | None:
    """Filtra por tipo si el usuario lo pide (hospedaje, hostal, hotel, casa…)."""
    lower = (text or "").lower()
    if re.search(
        r"\b(casa(s)?\s+(o|/)\s+departamento(s)?|departamento(s)?\s+entero(s)?|casa(s)?\s+completa(s)?)\b",
        lower,
    ):
        return [Accommodation.Type.CASA_DEPARTAMENTO]
    if re.search(r"\bhospedaj(es)?\b", lower):
        return [Accommodation.Type.HOSPEDAJE]
    if re.search(r"\bhostal(es)?\b", lower):
        return [Accommodation.Type.HOSTAL]
    if re.search(r"\bhotel(es)?\b", lower):
        return [Accommodation.Type.HOTEL]
    return None


def stay_types_phrase(types: list[str] | None) -> str:
    if not types:
        return "alojamientos"
    if types == [Accommodation.Type.HOSPEDAJE]:
        return "hospedajes"
    if types == [Accommodation.Type.HOSTAL]:
        return "hostales"
    if types == [Accommodation.Type.HOTEL]:
        return "hoteles"
    if types == [Accommodation.Type.CASA_DEPARTAMENTO]:
        return "casas o departamentos"
    return "alojamientos"


def search_stays(city: str, limit: int = 3, message: str = "") -> list[dict]:
    q = _clean_place_token(city or "")
    if not q:
        return []

    types = extract_stay_types(message)
    country_wide = is_country_scope(q, message)
    if country_wide:
        limit = max(limit, 10)

    base_qs = Accommodation.objects.filter(
        status=Accommodation.Status.APROBADO,
        is_active=True,
        is_deleted=False,
    )
    if types:
        base_qs = base_qs.filter(type__in=types)

    if country_wide:
        qs = (
            base_qs.filter(
                Q(country__icontains="peru")
                | Q(country__icontains="perú")
                | Q(country__iexact="Perú")
            )
            .prefetch_related("fotos")
            .order_by("-average_rating", "name")[:limit]
        )
    else:
        # Algunas ubicaciones (p. ej. "Tingo María") se guardan como distrito
        # en `Accommodation.city` (p. ej. "Rupa Rupa"). Expandimos texto libre
        # usando el mapeo UBIGEO para que Hospix encuentre resultados.
        mapped = expand_free_text_location_to_cities(city) or []
        candidates = [q, *mapped]

        place_q = Q()
        for cand in candidates:
            cand = (cand or "").strip()
            if not cand:
                continue
            place_q |= (
                Q(city__icontains=cand)
                | Q(region__icontains=cand)
                | Q(name__icontains=cand)
            )

        qs = (
            base_qs.filter(place_q)
            .prefetch_related("fotos")
            .distinct()[:limit]
        )

    if not qs.exists() and q and not types and not country_wide:
        qs = base_qs.prefetch_related("fotos").order_by("-average_rating")[:limit]

    cards = []
    for acc in qs:
        min_price = (
            Room.objects.filter(accommodation=acc, is_active=True).aggregate(
                m=Min("base_price")
            )["m"]
        )
        price = f"S/ {min_price:.0f} / noche" if min_price else "Consultar precio"
        image = _primary_photo_url(acc)
        card = {
            "id": str(acc.pk),
            "name": acc.name,
            "type": acc.type,
            "type_label": TYPE_LABELS.get(acc.type, acc.type),
            "location": f"{acc.city}, {acc.region}",
            "price": price,
            "link": f"/hospedajes/{acc.pk}",
        }
        if image:
            card["image"] = image
        cards.append(card)
    return cards


def match_faq(text: str) -> str | None:
    lower = text.lower()
    for entry in FAQ_ENTRIES:
        if any(k in lower for k in entry["keys"]):
            return entry["answer"]
    return None


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


def _clean_place_token(raw: str) -> str:
    return re.sub(r"[{}!?.,;:]+", "", (raw or "").strip()).strip()


def is_peru_country_query(text: str) -> bool:
    """True si piden todo el país y no una ciudad concreta."""
    lower = _clean_place_token(text).lower()
    if not re.search(r"\b(perú|peru)\b", lower):
        return False
    for c in PERU_CITIES:
        if c in lower:
            return False
    return True


def extract_city(text: str) -> str | None:
    lower = _clean_place_token(text).lower()
    if is_peru_country_query(text):
        return "Perú"

    for c in PERU_CITIES:
        if c in lower:
            return "Huánuco" if c == "huanuco" else c.capitalize()
    m = re.search(
        r"(?:en|para|hacia|buscar en|quiero ir a|hospedaje en|hostal en|hotel en)\s+"
        r"([a-záéíóúñü\s]{3,40})",
        lower,
        re.I,
    )
    if m:
        place = _clean_place_token(m.group(1))
        if place.lower() in ("peru", "perú"):
            return "Perú"
        return place.title()
    return None


def is_country_scope(place: str, message: str = "") -> bool:
    p = _clean_place_token(place).lower()
    if p in ("peru", "perú"):
        return True
    return is_peru_country_query(message)


def build_llm_data_context(message: str) -> str:
    """Contexto extra para el LLM: FAQ y hospedajes reales según el mensaje."""
    parts: list[str] = []
    faq = match_faq(message)
    if faq:
        parts.append(f"FAQ relevante:\n{faq}")

    city = extract_city(message)
    if city:
        types = extract_stay_types(message)
        phrase = stay_types_phrase(types)
        lim = 10 if is_country_scope(city, message) else 5
        cards = search_stays(city, limit=lim, message=message)
        if cards:
            parts.append(
                f"{phrase.capitalize()} verificados en o cerca de {city} (usa SOLO estos en cards, "
                f"respeta el tipo pedido):\n"
                + json.dumps(cards, ensure_ascii=False)
            )
        else:
            hint = (
                f"No hay {phrase} activos en {city} ahora."
                if types
                else f"No hay alojamientos activos en {city} ahora."
            )
            parts.append(hint)

    return "\n\n".join(parts)
