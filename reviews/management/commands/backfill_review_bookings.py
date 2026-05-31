"""Vincula reseñas existentes con la reserva completada más reciente del huésped."""

from django.core.management.base import BaseCommand

from reviews.models import Review
from reviews.services import resolve_review_booking


class Command(BaseCommand):
    help = "Asocia booking a reseñas que no tienen reserva vinculada."

    def handle(self, *args, **options):
        updated = 0
        for review in Review.objects.filter(booking__isnull=True).select_related(
            "author", "accommodation"
        ):
            booking = resolve_review_booking(
                review.author, review.accommodation_id, booking_id=None
            )
            if booking:
                review.booking = booking
                review.save(update_fields=["booking", "updated_at"])
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"Reseñas actualizadas: {updated}"))
