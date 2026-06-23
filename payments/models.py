from django.conf import settings
from django.db import models

from properties.models import TimeStampedModel


class Payment(TimeStampedModel):
    class Method(models.TextChoices):
        YAPE = "yape", "Yape"
        CARD = "card", "Tarjeta"
        PAGOEFECTIVO = "pagoefectivo", "PagoEfectivo"
        PLIN = "plin", "Plin"
        EXTERNO = "externo", "Pago directo con anfitrión"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        PROCESANDO = "procesando", "Procesando"
        PAGADO = "pagado", "Pagado"
        FALLIDO = "fallido", "Fallido"
        EXPIRADO = "expirado", "Expirado"
        CANCELADO = "cancelado", "Cancelado"

    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pagos",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PEN")
    method = models.CharField(
        max_length=20,
        choices=Method.choices,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    gateway = models.CharField(max_length=32, default="mock")
    gateway_charge_id = models.CharField(max_length=128, blank=True)
    gateway_order_id = models.CharField(max_length=128, blank=True)
    failure_message = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    external_operation_number = models.CharField(
        "número de operación (pago directo)",
        max_length=64,
        blank=True,
        help_text="Referencia que reporta el huésped al registrar pago directo.",
    )
    guest_reported_amount = models.DecimalField(
        "monto reportado por huésped",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Importe que el huésped indica haber pagado fuera de la pasarela.",
    )

    class Meta:
        verbose_name = "pago"
        verbose_name_plural = "pagos"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["guest", "status"]),
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self):
        return f"Pago #{self.pk} — reserva {self.booking_id} ({self.status})"
