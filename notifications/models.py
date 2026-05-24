from django.conf import settings
from django.db import models

from properties.models import TimeStampedModel


class InboxItem(TimeStampedModel):
    """Notificaciones del sistema y mensajes según rol (huésped, propietario, admin)."""

    class Channel(models.TextChoices):
        NOTIFICACION = "notificacion", "Notificación"
        MENSAJE = "mensaje", "Mensaje"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inbox_items",
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    kind = models.CharField(max_length=50, blank=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_inbox_items",
    )

    class Meta:
        verbose_name = "elemento de bandeja"
        verbose_name_plural = "elementos de bandeja"
        ordering = ("-updated_at", "-created_at")
        indexes = [
            models.Index(fields=["recipient", "channel", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.channel}: {self.title} → {self.recipient_id}"
