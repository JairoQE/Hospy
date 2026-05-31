"""Publica reseñas pendientes (útil si se enviaron con REVIEWS_AUTO_APPROVE=false)."""

from django.core.management.base import BaseCommand

from reviews.models import Review
from reviews.services import moderate_review


class Command(BaseCommand):
    help = "Aprueba todas las reseñas en estado pendiente y actualiza calificaciones."

    def handle(self, *args, **options):
        pending = Review.objects.filter(status=Review.Status.PENDIENTE).order_by("id")
        count = 0
        for review in pending:
            moderate_review(review, approved=True)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Reseñas aprobadas: {count}"))
