from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .models import AccommodationOffer

TWOPLACES = Decimal("0.01")


def apply_discount(price: Decimal, discount_percent: Decimal) -> Decimal:
    factor = (Decimal("100") - discount_percent) / Decimal("100")
    return (price * factor).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _active_offers_qs(on_date: date):
    return AccommodationOffer.objects.filter(
        is_active=True,
        start_date__lte=on_date,
        end_date__gte=on_date,
    )


def get_active_offer_for_room(
    room_id: int,
    accommodation_id: int,
    on_date: date | None = None,
) -> AccommodationOffer | None:
    on_date = on_date or timezone.localdate()
    return (
        _active_offers_qs(on_date)
        .filter(accommodation_id=accommodation_id, rooms__id=room_id)
        .order_by("-discount_percent", "-start_date")
        .first()
    )


def get_active_offer(accommodation_id: int, on_date: date | None = None) -> AccommodationOffer | None:
    """Primera oferta vigente del hospedaje (compatibilidad). Preferir get_active_offer_for_room."""
    on_date = on_date or timezone.localdate()
    return (
        _active_offers_qs(on_date)
        .filter(accommodation_id=accommodation_id)
        .order_by("-discount_percent", "-start_date")
        .first()
    )


def accommodation_ids_with_active_offers(on_date: date | None = None) -> list[int]:
    on_date = on_date or timezone.localdate()
    return list(
        _active_offers_qs(on_date)
        .filter(rooms__is_active=True)
        .values_list("accommodation_id", flat=True)
        .distinct()
    )


def rooms_overlap_in_offers(
    accommodation_id: int,
    room_ids: list[int],
    start: date,
    end: date,
    exclude_id: int | None = None,
) -> bool:
    if not room_ids:
        return False
    qs = AccommodationOffer.objects.filter(
        accommodation_id=accommodation_id,
        is_active=True,
        start_date__lte=end,
        end_date__gte=start,
        rooms__id__in=room_ids,
    ).distinct()
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()


def offers_overlap(
    accommodation_id: int,
    start: date,
    end: date,
    exclude_id: int | None = None,
) -> bool:
    """Deprecado: usar rooms_overlap_in_offers con habitaciones concretas."""
    qs = AccommodationOffer.objects.filter(
        accommodation_id=accommodation_id,
        is_active=True,
        start_date__lte=end,
        end_date__gte=start,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()


def build_room_offer_map(offers) -> dict[int, AccommodationOffer]:
    room_to_offer: dict[int, AccommodationOffer] = {}
    for offer in offers:
        for room in offer.rooms.all():
            if room.is_active:
                room_to_offer[room.id] = offer
    return room_to_offer


def get_accommodation_display_prices(accommodation, on_date: date | None = None) -> dict:
    """Precio mínimo para listados considerando ofertas solo en habitaciones seleccionadas."""
    on_date = on_date or timezone.localdate()
    base_min = getattr(accommodation, "precio_desde", None)

    rooms = list(
        accommodation.habitaciones.filter(is_active=True).only("id", "base_price")
    )
    if not rooms:
        return {
            "precio_desde": base_min,
            "precio_desde_original": None,
            "oferta_activa": False,
            "descuento_porcentaje": None,
        }

    offers = getattr(accommodation, "active_offers_list", None)
    if offers is None:
        offers = list(
            _active_offers_qs(on_date)
            .filter(accommodation_id=accommodation.pk)
            .prefetch_related("rooms")
        )
    else:
        for offer in offers:
            list(offer.rooms.all())

    room_to_offer = build_room_offer_map(offers)
    min_eff = None
    min_orig = None
    max_discount = None

    for room in rooms:
        base = room.base_price
        offer = room_to_offer.get(room.id)
        eff = apply_discount(base, offer.discount_percent) if offer else base
        if offer and (max_discount is None or offer.discount_percent > max_discount):
            max_discount = offer.discount_percent
        if min_eff is None or eff < min_eff:
            min_eff = eff
            min_orig = base if offer else None

    return {
        "precio_desde": min_eff,
        "precio_desde_original": min_orig,
        "oferta_activa": bool(room_to_offer),
        "descuento_porcentaje": max_discount,
    }
