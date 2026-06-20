from celery import shared_task
from django.utils import timezone

from .models import Booking


@shared_task(name="bookings.complete_past_bookings")
def complete_past_bookings() -> int:
    """
    Marca como completadas las reservas confirmadas cuya salida ya pasó.
    Programada vía Celery Beat (documento §7.4).
    """
    today = timezone.localdate()
    return Booking.objects.filter(
        status=Booking.Status.CONFIRMADA,
        check_out__lte=today,
    ).update(status=Booking.Status.COMPLETADA)


@shared_task(name="bookings.notify_created")
def notify_booking_created_task(booking_id: int) -> None:
    from .services import _notify_booking_created_sync

    _notify_booking_created_sync(booking_id)


@shared_task(name="bookings.notify_confirmed")
def notify_booking_confirmed_task(booking_id: int) -> None:
    from .services import _notify_booking_confirmed_sync

    _notify_booking_confirmed_sync(booking_id)


@shared_task(name="bookings.notify_rejected")
def notify_booking_rejected_task(booking_id: int) -> None:
    from .services import _notify_booking_rejected_sync

    _notify_booking_rejected_sync(booking_id)


@shared_task(name="bookings.notify_cancelled")
def notify_booking_cancelled_task(booking_id: int) -> None:
    from .services import _notify_booking_cancelled_sync

    _notify_booking_cancelled_sync(booking_id)


@shared_task(name="bookings.send_check_in_reminders")
def send_check_in_reminders() -> int:
    """
    Alerta al propietario 1 día antes del check-in (reservas pendientes o confirmadas).
    Programada vía Celery Beat.
    """
    from django.utils import timezone

    from notifications.services import notify_check_in_reminder

    from .owner_calendar import bookings_needing_check_in_reminder

    sent = 0
    for booking in bookings_needing_check_in_reminder():
        notify_check_in_reminder(booking)
        booking.check_in_reminder_sent_at = timezone.now()
        booking.save(update_fields=["check_in_reminder_sent_at", "updated_at"])
        sent += 1
    return sent
