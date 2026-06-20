from django.conf import settings
from django.db import models

from properties.models import TimeStampedModel
from rooms.models import Room


class Booking(TimeStampedModel):
    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        CONFIRMADA = "confirmada", "Confirmada"
        CANCELADA = "cancelada", "Cancelada"
        COMPLETADA = "completada", "Completada"

    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservas",
    )
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="reservas")
    check_in = models.DateField()
    check_out = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    check_in_reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Cuándo se envió al propietario la alerta de check-in (1 día antes).",
    )

    class Meta:
        verbose_name = "reserva"
        verbose_name_plural = "reservas"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["room", "status", "check_in", "check_out"]),
            models.Index(fields=["guest", "status"]),
        ]

    def __str__(self):
        return f"Reserva #{self.pk} — {self.room}"
