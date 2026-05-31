from decimal import Decimal

from django.conf import settings
from django.db.models import Avg

from bookings.models import Booking
from properties.models import Accommodation

from .models import Review


def guest_has_completed_stay(guest, accommodation_id: int) -> bool:
    """RF-41: reserva completada en ese hospedaje."""
    return Booking.objects.filter(
        guest=guest,
        status=Booking.Status.COMPLETADA,
        room__accommodation_id=accommodation_id,
    ).exists()


def booking_for_review(review: Review) -> Booking | None:
    """Reserva asociada a la reseña o la última completada del huésped en ese hospedaje."""
    if review.booking_id:
        return review.booking
    return (
        Booking.objects.filter(
            guest=review.author,
            room__accommodation_id=review.accommodation_id,
            status=Booking.Status.COMPLETADA,
        )
        .select_related("room")
        .order_by("-check_out", "-id")
        .first()
    )


def resolve_review_booking(
    guest,
    accommodation_id: int,
    booking_id: int | None = None,
) -> Booking | None:
    if booking_id:
        return (
            Booking.objects.filter(
                pk=booking_id,
                guest=guest,
                room__accommodation_id=accommodation_id,
                status=Booking.Status.COMPLETADA,
            )
            .select_related("room", "room__accommodation")
            .first()
        )
    return (
        Booking.objects.filter(
            guest=guest,
            room__accommodation_id=accommodation_id,
            status=Booking.Status.COMPLETADA,
        )
        .select_related("room", "room__accommodation")
        .order_by("-check_out", "-id")
        .first()
    )


def guest_already_reviewed(guest, accommodation_id: int) -> bool:
    return (
        Review.objects.filter(
            author=guest,
            accommodation_id=accommodation_id,
        )
        .exclude(status=Review.Status.RECHAZADA)
        .exists()
    )


def reviews_auto_approve_enabled() -> bool:
    return bool(getattr(settings, "REVIEWS_AUTO_APPROVE", True))


def create_guest_review(
    *,
    author,
    accommodation: Accommodation,
    rating: int,
    comment: str,
    booking: Booking | None = None,
) -> Review:
    """Crea reseña; publica de inmediato si REVIEWS_AUTO_APPROVE está activo."""
    status = (
        Review.Status.APROBADA
        if reviews_auto_approve_enabled()
        else Review.Status.PENDIENTE
    )
    review = Review.objects.create(
        author=author,
        accommodation=accommodation,
        booking=booking,
        rating=rating,
        comment=comment,
        status=status,
    )
    if status == Review.Status.APROBADA:
        recalculate_accommodation_rating(accommodation)
    return review


def recalculate_accommodation_rating(accommodation: Accommodation) -> None:
    """RF-12, RF-45: promedio de reseñas aprobadas."""
    result = Review.objects.filter(
        accommodation=accommodation,
        status=Review.Status.APROBADA,
    ).aggregate(avg=Avg("rating"))
    avg = result["avg"]
    accommodation.average_rating = (
        Decimal(str(round(avg, 2))) if avg is not None else Decimal("0")
    )
    accommodation.save(update_fields=["average_rating", "updated_at"])


def moderate_review(review: Review, approved: bool) -> Review:
    if review.status != Review.Status.PENDIENTE:
        raise ValueError("Solo se pueden moderar reseñas pendientes.")

    review.status = Review.Status.APROBADA if approved else Review.Status.RECHAZADA
    review.save(update_fields=["status", "updated_at"])

    if approved:
        recalculate_accommodation_rating(review.accommodation)
    notify_review_moderated(review, approved)
    return review


def _notify_review_moderated_sync(review_id: int, approved: bool) -> None:
    from config.mail import queue_email

    review = Review.objects.select_related("author", "accommodation").get(pk=review_id)
    subject = (
        "Hospy: tu reseña fue publicada"
        if approved
        else "Hospy: tu reseña no fue publicada"
    )
    body = (
        f"Hola {review.author.first_name},\n\n"
        f"Tu reseña sobre «{review.accommodation.name}» "
        f"{'ya está visible' if approved else 'no fue aprobada por el equipo de moderación'}.\n\n"
        "— Equipo Hospy"
    )
    queue_email(subject, body, review.author.email)


def notify_review_moderated(review: Review, approved: bool) -> None:
    from .tasks import notify_review_moderated_task

    notify_review_moderated_task.delay(review.pk, approved)
