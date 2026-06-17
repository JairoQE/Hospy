import os
import logging

from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from properties.models import Accommodation
from rooms.models import Room
from rooms.services import calculate_stay_total, get_day_status

from .models import Booking

logger = logging.getLogger(__name__)

ACTIVE_BLOCKING_STATUSES = (
    Booking.Status.PENDIENTE,
    Booking.Status.CONFIRMADA,
)

CANCELLATION_HOURS_BEFORE_CHECKIN = int(
    os.environ.get("BOOKING_CANCEL_HOURS_BEFORE_CHECKIN", "48")
)


def booking_cancellation_status(booking: Booking, user) -> tuple[bool, str | None]:
    """
    Huésped: pendiente/confirmada y al menos N h antes del check-in.
    Propietario: pendiente/confirmada (sin límite de horas).
    """
    if booking.status not in (Booking.Status.PENDIENTE, Booking.Status.CONFIRMADA):
        if booking.status == Booking.Status.COMPLETADA:
            return False, "La estadía ya finalizó; no se puede cancelar."
        if booking.status == Booking.Status.CANCELADA:
            return False, "Esta reserva ya está cancelada."
        return False, "Esta reserva no puede cancelarse."

    from django.contrib.auth import get_user_model

    User = get_user_model()
    if user.role == User.Role.ADMINISTRADOR:
        return True, None

    is_owner = booking.room.accommodation.owner_id == user.id
    if is_owner:
        return True, None

    if booking.guest_id != user.id:
        return False, "No tienes permiso para cancelar esta reserva."

    check_in = booking.check_in
    if isinstance(check_in, datetime):
        check_in_date = check_in.date()
    else:
        check_in_date = check_in

    check_in_dt = timezone.make_aware(
        datetime.combine(check_in_date, time.min),
        timezone.get_current_timezone(),
    )
    deadline = check_in_dt - timedelta(hours=CANCELLATION_HOURS_BEFORE_CHECKIN)
    if timezone.now() > deadline:
        return (
            False,
            f"Solo puedes cancelar hasta {CANCELLATION_HOURS_BEFORE_CHECKIN} horas antes del check-in.",
        )
    return True, None


def is_room_available(
    room: Room,
    check_in,
    check_out,
    *,
    exclude_booking_id: int | None = None,
) -> tuple[bool, str | None]:
    """RF-34: verifica cada noche del rango [check_in, check_out)."""
    if check_out <= check_in:
        return False, "La fecha de salida debe ser posterior a la de entrada."
    if not room.is_active:
        return False, "La habitación no está disponible."
    acc = room.accommodation
    if (
        acc.is_deleted
        or acc.status != Accommodation.Status.APROBADO
        or not acc.is_active
    ):
        return False, "El hospedaje no está disponible para reservas."

    from accounts.payout import (
        PAYOUT_INCOMPLETE_MESSAGE,
        owner_has_complete_payout_profile,
    )

    owner = acc.owner
    if not owner_has_complete_payout_profile(owner):
        return False, PAYOUT_INCOMPLETE_MESSAGE

    current = check_in
    while current < check_out:
        status = get_day_status(room, current)
        if status != "disponible":
            if exclude_booking_id and _day_blocked_by_booking(
                room, current, exclude_booking_id
            ):
                current += timedelta(days=1)
                continue
            return False, f"No disponible el día {current} ({status})."
        current += timedelta(days=1)
    return True, None


def _day_blocked_by_booking(room: Room, day, booking_id: int) -> bool:
    return Booking.objects.filter(
        pk=booking_id,
        room=room,
        status__in=ACTIVE_BLOCKING_STATUSES,
        check_in__lte=day,
        check_out__gt=day,
    ).exists()


def create_booking(guest, room: Room, check_in, check_out) -> Booking:
    with transaction.atomic():
        room = (
            Room.objects.select_for_update()
            .select_related("accommodation")
            .get(pk=room.pk)
        )
        available, message = is_room_available(room, check_in, check_out)
        if not available:
            raise ValueError(message)

        pricing = calculate_stay_total(room, check_in, check_out)
        booking = Booking.objects.create(
            guest=guest,
            room=room,
            check_in=check_in,
            check_out=check_out,
            total_amount=pricing["total"],
            status=Booking.Status.PENDIENTE,
        )
    from properties.panel_cache import invalidate_booking_panel_caches

    invalidate_booking_panel_caches(booking)
    return booking


def notify_booking_created_safe(booking: Booking) -> None:
    """Notificaciones post-reserva; no deben revertir la reserva si fallan."""
    try:
        notify_booking_created(booking)
    except Exception:
        logger.exception("No se pudieron enviar notificaciones de reserva #%s", booking.pk)


def _notify_booking_safe(notify_fn, booking: Booking, label: str) -> None:
    try:
        notify_fn(booking)
    except Exception:
        logger.exception("No se pudieron enviar notificaciones (%s) de reserva #%s", label, booking.pk)


def confirm_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.PENDIENTE:
        raise ValueError("Solo se pueden confirmar reservas pendientes.")
    booking.status = Booking.Status.CONFIRMADA
    booking.save(update_fields=["status", "updated_at"])
    from properties.panel_cache import invalidate_booking_panel_caches

    invalidate_booking_panel_caches(booking)
    _notify_booking_safe(notify_booking_confirmed, booking, "confirmada")
    return booking


def reject_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.PENDIENTE:
        raise ValueError("Solo se pueden rechazar reservas pendientes.")
    booking.status = Booking.Status.CANCELADA
    booking.save(update_fields=["status", "updated_at"])
    from properties.panel_cache import invalidate_booking_panel_caches

    invalidate_booking_panel_caches(booking)
    _notify_booking_safe(notify_booking_rejected, booking, "rechazada")
    return booking


def cancel_booking(booking: Booking, *, actor=None) -> Booking:
    if actor is not None:
        allowed, reason = booking_cancellation_status(booking, actor)
        if not allowed:
            raise ValueError(reason or "Esta reserva no puede cancelarse.")
    elif booking.status not in (Booking.Status.PENDIENTE, Booking.Status.CONFIRMADA):
        raise ValueError("Esta reserva no puede cancelarse.")
    booking.status = Booking.Status.CANCELADA
    booking.save(update_fields=["status", "updated_at"])
    from properties.panel_cache import invalidate_booking_panel_caches

    invalidate_booking_panel_caches(booking)
    _notify_booking_safe(notify_booking_cancelled, booking, "cancelada")
    return booking


def complete_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.CONFIRMADA:
        raise ValueError("Solo reservas confirmadas pueden completarse.")
    booking.status = Booking.Status.COMPLETADA
    booking.save(update_fields=["status", "updated_at"])
    from properties.panel_cache import invalidate_booking_panel_caches

    invalidate_booking_panel_caches(booking)
    return booking


def _booking_queryset():
    return Booking.objects.select_related(
        "guest", "room", "room__accommodation", "room__accommodation__owner"
    )


def _booking_detail_lines(booking: Booking) -> str:
    room = booking.room
    return (
        f"Hospedaje: {room.accommodation.name}\n"
        f"Habitación: {room.number}\n"
        f"Entrada: {booking.check_in}\n"
        f"Salida: {booking.check_out}\n"
        f"Total: S/ {booking.total_amount}\n"
        f"Estado: {booking.status}"
    )


def _notify_booking_created_sync(booking_id: int) -> None:
    from config.mail import queue_email

    booking = _booking_queryset().get(pk=booking_id)
    detail = _booking_detail_lines(booking)
    queue_email(
        f"Hospy: reserva pendiente #{booking.pk}",
        f"Hola {booking.guest.first_name},\n\nTu reserva quedó pendiente de confirmación.\n{detail}\n",
        booking.guest.email,
    )
    owner = booking.room.accommodation.owner
    queue_email(
        f"Hospy: nueva reserva pendiente #{booking.pk}",
        f"Hola {owner.first_name},\n\nTienes una nueva reserva por confirmar.\n{detail}\n",
        owner.email,
    )
    from notifications.services import notify_booking_created_inbox

    notify_booking_created_inbox(booking)


def _notify_booking_confirmed_sync(booking_id: int) -> None:
    from config.mail import queue_email

    booking = _booking_queryset().get(pk=booking_id)
    queue_email(
        f"Hospy: reserva #{booking.pk} confirmada",
        f"Hola {booking.guest.first_name},\n\nTu reserva fue confirmada.\n{_booking_detail_lines(booking)}\n",
        booking.guest.email,
    )
    from notifications.services import notify_booking_confirmed_inbox

    notify_booking_confirmed_inbox(booking)


def _notify_booking_rejected_sync(booking_id: int) -> None:
    from config.mail import queue_email

    booking = _booking_queryset().get(pk=booking_id)
    queue_email(
        f"Hospy: reserva #{booking.pk} rechazada",
        f"Hola {booking.guest.first_name},\n\nEl propietario no pudo aceptar tu reserva.\n{_booking_detail_lines(booking)}\n",
        booking.guest.email,
    )
    from notifications.services import notify_booking_rejected_inbox

    notify_booking_rejected_inbox(booking)


def _notify_booking_cancelled_sync(booking_id: int) -> None:
    from config.mail import queue_email

    booking = _booking_queryset().get(pk=booking_id)
    queue_email(
        f"Hospy: reserva #{booking.pk} cancelada",
        f"Hola {booking.guest.first_name},\n\nTu reserva fue cancelada.\n{_booking_detail_lines(booking)}\n",
        booking.guest.email,
    )
    from notifications.services import notify_booking_cancelled_inbox

    notify_booking_cancelled_inbox(booking)


def notify_booking_created(booking: Booking) -> None:
    from .tasks import notify_booking_created_task

    notify_booking_created_task.delay(booking.pk)


def notify_booking_confirmed(booking: Booking) -> None:
    from .tasks import notify_booking_confirmed_task

    notify_booking_confirmed_task.delay(booking.pk)


def notify_booking_rejected(booking: Booking) -> None:
    from .tasks import notify_booking_rejected_task

    notify_booking_rejected_task.delay(booking.pk)


def notify_booking_cancelled(booking: Booking) -> None:
    from .tasks import notify_booking_cancelled_task

    notify_booking_cancelled_task.delay(booking.pk)
