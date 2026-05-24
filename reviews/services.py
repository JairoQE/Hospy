from decimal import Decimal

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


def guest_already_reviewed(guest, accommodation_id: int) -> bool:
    return (
        Review.objects.filter(
            author=guest,
            accommodation_id=accommodation_id,
        )
        .exclude(status=Review.Status.RECHAZADA)
        .exists()
    )


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
