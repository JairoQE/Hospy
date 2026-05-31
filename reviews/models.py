from django.conf import settings
from django.db import models

from properties.models import Accommodation, TimeStampedModel


class Review(TimeStampedModel):
    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de moderación"
        APROBADA = "aprobada", "Aprobada"
        RECHAZADA = "rechazada", "Rechazada"

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="resenas",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resenas",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resenas",
    )
    rating = models.PositiveSmallIntegerField()  # 1-5
    comment = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )

    class Meta:
        verbose_name = "reseña"
        verbose_name_plural = "reseñas"
        ordering = ("-created_at",)

    def __str__(self):
        return f"Reseña {self.rating}★ — {self.accommodation.name}"
