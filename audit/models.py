from django.conf import settings
from django.db import models

from .actions import action_label


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="usuario",
    )
    actor_role = models.CharField(max_length=20, blank=True, db_index=True)
    actor_email = models.EmailField(blank=True)
    actor_name = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=64, db_index=True)
    target_type = models.CharField(max_length=64, blank=True, db_index=True)
    target_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    target_label = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "registro de auditoría"
        verbose_name_plural = "registros de auditoría"
        indexes = [
            models.Index(fields=["-created_at", "action"]),
            models.Index(fields=["actor_role", "-created_at"]),
        ]

    def __str__(self):
        who = self.actor_email or "sistema"
        return f"{action_label(self.action)} — {who} ({self.created_at:%Y-%m-%d %H:%M})"

    @property
    def action_label(self) -> str:
        return action_label(self.action)
