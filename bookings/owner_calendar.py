"""Calendario de ocupación para el panel del propietario."""

from __future__ import annotations

from datetime import date, timedelta

from bookings.models import Booking
from properties.models import Accommodation
from rooms.models import Room

OWNER_ACTIVE_BOOKING_STATUSES = (
    Booking.Status.PENDIENTE,
    Booking.Status.CONFIRMADA,
)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    first = date(year, month, 1)
    if month == 12:
        last = date(year, 12, 31)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    return first, last


def _booking_brief(booking: Booking) -> dict:
    guest = booking.guest
    acc = booking.room.accommodation
    return {
        "id": booking.id,
        "hospedaje": acc.name,
        "accommodation_id": acc.id,
        "habitacion": booking.room.number,
        "guest_name": guest.get_full_name() or guest.email,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "status": booking.status,
        "is_check_in_day": False,
    }


def build_owner_occupancy_calendar(
    owner,
    year: int,
    month: int,
    *,
    accommodation_id: int | None = None,
) -> dict:
    """
    Mes de ocupación para todos los locales del propietario (o uno filtrado).

    - libre: ninguna habitación reservada esa noche
    - parcial: hay reservas pero quedan habitaciones libres
    - ocupado: todas las habitaciones activas del alcance están reservadas
    """
    first, last = _month_bounds(year, month)

    acc_qs = Accommodation.objects.filter(is_deleted=False, owner=owner)
    if accommodation_id is not None:
        acc_qs = acc_qs.filter(pk=accommodation_id)

    total_rooms = Room.objects.filter(
        accommodation__in=acc_qs,
        is_active=True,
    ).count()

    bookings_qs = (
        Booking.objects.filter(
            room__accommodation__owner=owner,
            status__in=OWNER_ACTIVE_BOOKING_STATUSES,
            check_in__lte=last,
            check_out__gt=first,
        )
        .select_related("guest", "room", "room__accommodation")
        .order_by("check_in", "id")
    )
    if accommodation_id is not None:
        bookings_qs = bookings_qs.filter(room__accommodation_id=accommodation_id)

    bookings = list(bookings_qs)

    days = []
    current = first
    while current <= last:
        night_bookings = [
            b for b in bookings if b.check_in <= current < b.check_out
        ]
        occupied_rooms = len({b.room_id for b in night_bookings})
        check_ins = [b for b in bookings if b.check_in == current]

        if occupied_rooms == 0:
            status = "libre"
        elif total_rooms > 0 and occupied_rooms >= total_rooms:
            status = "ocupado"
        else:
            status = "parcial"

        day_rows = []
        seen_ids: set[int] = set()
        for b in night_bookings + check_ins:
            if b.id in seen_ids:
                continue
            seen_ids.add(b.id)
            row = _booking_brief(b)
            row["is_check_in_day"] = b.check_in == current
            day_rows.append(row)

        days.append(
            {
                "date": current.isoformat(),
                "status": status,
                "occupied_rooms": occupied_rooms,
                "total_rooms": total_rooms,
                "check_ins_count": len(check_ins),
                "bookings": day_rows,
            }
        )
        current += timedelta(days=1)

    return {
        "anio": year,
        "mes": month,
        "accommodation_id": accommodation_id,
        "total_rooms": total_rooms,
        "days": days,
    }


def bookings_needing_check_in_reminder(for_date: date | None = None) -> list[Booking]:
    """Reservas activas con check-in en for_date (default: mañana) sin recordatorio enviado."""
    from django.utils import timezone

    target = for_date or (timezone.localdate() + timedelta(days=1))
    return list(
        Booking.objects.filter(
            status__in=OWNER_ACTIVE_BOOKING_STATUSES,
            check_in=target,
            check_in_reminder_sent_at__isnull=True,
        )
        .select_related("guest", "room", "room__accommodation", "room__accommodation__owner")
        .order_by("check_in", "id")
    )
