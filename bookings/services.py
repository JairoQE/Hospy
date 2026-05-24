from datetime import timedelta

from django.db import transaction

from properties.models import Accommodation
from rooms.models import Room
from rooms.services import calculate_stay_total, get_day_status

from .models import Booking

ACTIVE_BLOCKING_STATUSES = (
    Booking.Status.PENDIENTE,
    Booking.Status.CONFIRMADA,
)


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
    notify_booking_created(booking)
    return booking


def confirm_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.PENDIENTE:
        raise ValueError("Solo se pueden confirmar reservas pendientes.")
    booking.status = Booking.Status.CONFIRMADA
    booking.save(update_fields=["status", "updated_at"])
    notify_booking_confirmed(booking)
    return booking


def reject_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.PENDIENTE:
        raise ValueError("Solo se pueden rechazar reservas pendientes.")
    booking.status = Booking.Status.CANCELADA
    booking.save(update_fields=["status", "updated_at"])
    notify_booking_rejected(booking)
    return booking


def cancel_booking(booking: Booking) -> Booking:
    if booking.status not in (Booking.Status.PENDIENTE, Booking.Status.CONFIRMADA):
        raise ValueError("Esta reserva no puede cancelarse.")
    booking.status = Booking.Status.CANCELADA
    booking.save(update_fields=["status", "updated_at"])
    notify_booking_cancelled(booking)
    return booking


def complete_booking(booking: Booking) -> Booking:
    if booking.status != Booking.Status.CONFIRMADA:
        raise ValueError("Solo reservas confirmadas pueden completarse.")
    booking.status = Booking.Status.COMPLETADA
    booking.save(update_fields=["status", "updated_at"])
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
