from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import models


class IpSecurityAlert(models.Model):
    """Alertas de seguridad derivadas de ip.guide (pagos, cuentas, propietarios)."""

    class Kind(models.TextChoices):
        PAYMENT_RISK = "payment_risk", "Riesgo en pago"
        ACCOUNT_ANOMALY = "account_anomaly", "Anomalía de cuenta"
        OWNER_MISMATCH = "owner_mismatch", "Propietario vs ubicación"
        REGISTRATION_ABUSE = "registration_abuse", "Abuso de registro"
        ADMIN_HOSTING = "admin_hosting", "Admin desde hosting"

    class Severity(models.TextChoices):
        LOW = "low", "Baja"
        MEDIUM = "medium", "Media"
        HIGH = "high", "Alta"

    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    severity = models.CharField(
        max_length=16,
        choices=Severity.choices,
        default=Severity.MEDIUM,
        db_index=True,
    )
    message = models.CharField(max_length=500)
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ip_security_alerts",
    )
    metadata = models.JSONField(default=dict, blank=True)
    is_resolved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "alerta de seguridad IP"
        verbose_name_plural = "alertas de seguridad IP"
        indexes = [
            models.Index(fields=["-created_at", "severity"]),
            models.Index(fields=["kind", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_kind_display()} · {self.message[:60]}"


def create_security_alert(
    *,
    kind: str,
    severity: str,
    message: str,
    ip_address: str | None = None,
    user=None,
    metadata: dict[str, Any] | None = None,
) -> IpSecurityAlert | None:
    if not getattr(settings, "IP_GUIDE_ENABLED", True):
        return None
    try:
        return IpSecurityAlert.objects.create(
            kind=kind,
            severity=severity,
            message=message[:500],
            ip_address=ip_address,
            user=user if getattr(user, "is_authenticated", False) else None,
            metadata=metadata or {},
        )
    except Exception:
        return None
