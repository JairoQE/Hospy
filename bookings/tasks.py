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
