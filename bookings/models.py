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


class BookingRefund(TimeStampedModel):
    """Reembolso directo (fuera de pasarela) coordinado entre anfitrión y huésped."""

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de reembolso"
        REPORTADO = "reportado", "Reembolso reportado por anfitrión"
        CONFIRMADO = "confirmado", "Confirmado por huésped"
        DISPUTADO = "disputado", "Reportado al administrador"
        NO_APLICA = "no_aplica", "Sin reembolso"

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="refund",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    refund_percent = models.PositiveSmallIntegerField(null=True, blank=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha límite para que el anfitrión registre el reembolso.",
    )
    owner_operation_number = models.CharField(max_length=64, blank=True)
    owner_reported_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    owner_reported_at = models.DateTimeField(null=True, blank=True)
    guest_confirmed_at = models.DateTimeField(null=True, blank=True)
    dispute_notes = models.TextField(blank=True)
    disputed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "reembolso de reserva"
        verbose_name_plural = "reembolsos de reservas"
        ordering = ("-created_at",)

    def __str__(self):
        return f"Reembolso reserva #{self.booking_id} ({self.status})"
