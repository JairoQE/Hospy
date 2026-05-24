from django.conf import settings
from django.db import models

from properties.models import Accommodation, TimeStampedModel


class Conversation(TimeStampedModel):
    """Consulta pre-reserva entre un huésped y el propietario de un hospedaje."""

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guest_conversations",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owner_conversations",
    )
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    guest_last_read_at = models.DateTimeField(null=True, blank=True)
    owner_last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "conversación"
        verbose_name_plural = "conversaciones"
        ordering = ("-last_message_at", "-created_at")
        constraints = [
            models.UniqueConstraint(
                fields=["accommodation", "guest"],
                name="messaging_unique_guest_accommodation",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "-last_message_at"]),
            models.Index(fields=["guest", "-last_message_at"]),
        ]

    def __str__(self):
        return f"Conv #{self.pk} — {self.accommodation_id} / huésped {self.guest_id}"


class Message(TimeStampedModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages_sent",
    )
    body = models.TextField(max_length=2000)

    class Meta:
        verbose_name = "mensaje"
        verbose_name_plural = "mensajes"
        ordering = ("created_at",)

    def __str__(self):
        return f"Msg #{self.pk} en conv {self.conversation_id}"


class MessageReport(TimeStampedModel):
    """Denuncia de un mensaje de chat enviada a moderación."""

    class Reason(models.TextChoices):
        OFENSIVO = "ofensivo", "Contenido ofensivo"
        ACOSO = "acoso", "Acoso o amenazas"
        SPAM = "spam", "Spam o publicidad"
        ESTAFA = "estafa", "Estafa o engaño"
        OTRO = "otro", "Otro"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        REVISADO = "revisado", "Revisado"
        DESCARTADO = "descartado", "Descartado"

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reports_filed",
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    detail = models.TextField(blank=True, max_length=500)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="message_reports_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, max_length=500)

    class Meta:
        verbose_name = "reporte de mensaje"
        verbose_name_plural = "reportes de mensajes"
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["message", "reporter"],
                name="messaging_unique_report_per_user",
            ),
        ]

    def __str__(self):
        return f"Reporte #{self.pk} — mensaje {self.message_id}"
