from datetime import date, timedelta
from decimal import Decimal

from bookings.models import Booking
from properties.models import Accommodation

from .models import Room, RoomAvailability, SeasonRate

BOOKING_BLOCKED_STATUSES = (
    Booking.Status.PENDIENTE,
    Booking.Status.CONFIRMADA,
)

# Multiplicadores sobre precio base por temporada (ALTA=1 → mismo precio que base).
SEASON_PRICE_MULTIPLIERS: dict[str, Decimal] = {
    SeasonRate.Season.BAJA: Decimal("0.90"),
    SeasonRate.Season.NORMAL: Decimal("1.00"),
    SeasonRate.Season.ALTA: Decimal("1.00"),
    SeasonRate.Season.FERIADO: Decimal("1.10"),
}


def sync_season_rates_from_base(room: Room) -> None:
    """Recalcula tarifas de temporada cuando cambia el precio base de la habitación."""
    for rate in room.tarifas.all():
        mult = SEASON_PRICE_MULTIPLIERS.get(rate.season, Decimal("1.00"))
        rate.price_per_night = (room.base_price * mult).quantize(Decimal("0.01"))
        rate.save(update_fields=["price_per_night", "updated_at"])


def _season_rate_for_night(room: Room, night: date) -> SeasonRate | None:
    return (
        SeasonRate.objects.filter(
            room=room,
            start_date__lte=night,
            end_date__gte=night,
        )
        .order_by("-start_date")
        .first()
    )


def _nightly_base_price(room: Room, night: date) -> Decimal:
    """Precio de la noche según temporada activa, siempre derivado del precio base actual."""
    rate = _season_rate_for_night(room, night)
    if not rate:
        return room.base_price
    mult = SEASON_PRICE_MULTIPLIERS.get(rate.season, Decimal("1.00"))
    return (room.base_price * mult).quantize(Decimal("0.01"))


def get_nightly_price(room: Room, night: date) -> Decimal:
    """RF-26: tarifa de temporada vigente o precio base; oferta del hospedaje si aplica."""
    base = _nightly_base_price(room, night)
    from properties.offer_services import apply_discount, get_active_offer_for_room

    offer = get_active_offer_for_room(room.id, room.accommodation_id, night)
    if offer:
        return apply_discount(base, offer.discount_percent)
    return base


def get_nightly_price_breakdown(room: Room, night: date) -> dict:
    """Precio de una noche con detalle de oferta (para desglose y calendario)."""
    base = _nightly_base_price(room, night)
    from properties.offer_services import apply_discount, get_active_offer_for_room

    offer = get_active_offer_for_room(room.id, room.accommodation_id, night)
    if offer:
        return {
            "price": apply_discount(base, offer.discount_percent),
            "price_before_discount": base,
            "offer_applied": True,
            "discount_percent": offer.discount_percent,
        }
    return {"price": base, "price_before_discount": None, "offer_applied": False}


def calculate_stay_total(room: Room, check_in: date, check_out: date) -> dict:
    """RF-27: total y desglose por noche (check_out exclusivo)."""
    if check_out <= check_in:
        raise ValueError("La fecha de salida debe ser posterior a la de entrada.")

    nights = []
    current = check_in
    total = Decimal("0")
    offer_nights = 0
    while current < check_out:
        breakdown = get_nightly_price_breakdown(room, current)
        price = breakdown["price"]
        night_row = {"date": current.isoformat(), "price": price}
        if breakdown["offer_applied"]:
            night_row["price_before_discount"] = breakdown["price_before_discount"]
            night_row["offer_applied"] = True
            offer_nights += 1
        nights.append(night_row)
        total += price
        current += timedelta(days=1)

    result = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "nights_count": len(nights),
        "noches": len(nights),
        "nights": nights,
        "total": total,
    }
    if offer_nights:
        result["offer_applied"] = True
        result["offer_nights_count"] = offer_nights
    return result


def build_room_price_response(room: Room, check_in: date, check_out: date) -> dict:
    """Precio + disponibilidad para una habitación (API precio / cotización)."""
    from bookings.services import is_room_available

    data = calculate_stay_total(room, check_in, check_out)
    available, message = is_room_available(room, check_in, check_out)
    data["available"] = available
    if not available:
        data["availability_message"] = message
    data["room_id"] = room.id
    return data


def _booking_blocks_room(room: Room, day: date) -> bool:
    return Booking.objects.filter(
        room=room,
        status__in=BOOKING_BLOCKED_STATUSES,
        check_in__lte=day,
        check_out__gt=day,
    ).exists()


def get_day_status(room: Room, day: date) -> str:
    if not room.is_active:
        return "inactiva"
    if _booking_blocks_room(room, day):
        return "reservado"
    record = RoomAvailability.objects.filter(room=room, date=day).first()
    if record and not record.is_available:
        return record.reason or "bloqueo"
    return "disponible"


WHOLE_UNIT_ACCOMMODATION_TYPES = frozenset({Accommodation.Type.CASA_DEPARTAMENTO})


def accommodation_pricing_model(accommodation: Accommodation) -> str:
    """per_unit = casa/departamento (día bloqueado si el alojamiento está reservado)."""
    if accommodation.type in WHOLE_UNIT_ACCOMMODATION_TYPES:
        return "per_unit"
    return "per_room"


def aggregate_accommodation_day_status(accommodation: Accommodation, day: date) -> dict:
    """
    Estado agregado del calendario público del hospedaje.

    - per_unit: reserva en cualquier habitación activa → día ocupado (alojamiento completo).
    - per_room: ocupado solo si no queda ninguna habitación libre; parcial si hay reservas parciales.
    """
    rooms = list(
        Room.objects.filter(accommodation=accommodation, is_active=True).only("id", "is_active")
    )
    total = len(rooms)
    if total == 0:
        return {
            "status": "inactiva",
            "available": False,
            "rooms_available": 0,
            "rooms_total": 0,
        }

    statuses = [get_day_status(room, day) for room in rooms]
    disponibles = sum(1 for s in statuses if s == "disponible")
    reservados = sum(1 for s in statuses if s == "reservado")
    per_unit = accommodation_pricing_model(accommodation) == "per_unit"

    if per_unit:
        if reservados > 0:
            return {
                "status": "ocupado",
                "available": False,
                "rooms_available": 0,
                "rooms_total": total,
            }
        if disponibles == 0:
            return {
                "status": "bloqueado",
                "available": False,
                "rooms_available": 0,
                "rooms_total": total,
            }
        return {
            "status": "disponible",
            "available": True,
            "rooms_available": disponibles,
            "rooms_total": total,
        }

    if disponibles == 0:
        status = "ocupado" if reservados > 0 else "bloqueado"
        return {
            "status": status,
            "available": False,
            "rooms_available": 0,
            "rooms_total": total,
        }
    if reservados > 0:
        return {
            "status": "parcial",
            "available": True,
            "rooms_available": disponibles,
            "rooms_total": total,
        }
    return {
        "status": "disponible",
        "available": True,
        "rooms_available": disponibles,
        "rooms_total": total,
    }


def build_accommodation_monthly_calendar(
    accommodation: Accommodation, year: int, month: int
) -> list[dict]:
    first = date(year, month, 1)
    if month == 12:
        last = date(year, 12, 31)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)

    days = []
    current = first
    while current <= last:
        row = aggregate_accommodation_day_status(accommodation, current)
        row["date"] = current.isoformat()
        days.append(row)
        current += timedelta(days=1)
    return days


def build_monthly_calendar(room: Room, year: int, month: int) -> list[dict]:
    first = date(year, month, 1)
    if month == 12:
        last = date(year, 12, 31)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)

    days = []
    current = first
    while current <= last:
        status = get_day_status(room, current)
        price_info = get_nightly_price_breakdown(room, current)
        day_row = {
            "date": current.isoformat(),
            "status": status,
            "price": price_info["price"],
            "available": status == "disponible",
        }
        if price_info["offer_applied"]:
            day_row["price_before_discount"] = price_info["price_before_discount"]
            day_row["offer_applied"] = True
        days.append(day_row)
        current += timedelta(days=1)
    return days


def block_room_dates(room: Room, start: date, end: date, reason: str) -> int:
    """Bloquea fechas [start, end) — mismo criterio que check_out exclusivo."""
    if end <= start:
        raise ValueError("La fecha fin debe ser posterior a la de inicio.")

    created = 0
    current = start
    while current < end:
        if _booking_blocks_room(room, current):
            raise ValueError(f"La fecha {current} ya tiene una reserva activa.")
        RoomAvailability.objects.update_or_create(
            room=room,
            date=current,
            defaults={"is_available": False, "reason": reason},
        )
        created += 1
        current += timedelta(days=1)
    return created


def public_accommodation_for_rooms(accommodation_id: int) -> Accommodation:
    return Accommodation.objects.get(
        pk=accommodation_id,
        is_deleted=False,
        status=Accommodation.Status.APROBADO,
        is_active=True,
    )


def rates_overlap(
    room_id: int, start: date, end: date, exclude_id: int | None = None
) -> bool:
    qs = SeasonRate.objects.filter(
        room_id=room_id,
        start_date__lte=end,
        end_date__gte=start,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()
