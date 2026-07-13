from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import models
from django.utils import timezone

from .api_keys import generate_api_key, hash_api_key, key_display_prefix


class IntegrationClient(models.Model):
    """
    Cliente externo registrado (SIST / partner / desarrollador) con API Key propia.

    La clave en texto plano solo se muestra al generar/rotar; en BD se guarda hasheada.
    """

    class Status(models.TextChoices):
        PENDING = "pendiente", "Pendiente"
        ACTIVE = "activo", "Activo"
        REVOKED = "revocado", "Revocado"

    name = models.CharField("nombre del sistema", max_length=120)
    organization = models.CharField("organización", max_length=120, blank=True)
    contact_email = models.EmailField("correo de contacto")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integration_clients",
        verbose_name="usuario responsable (opcional)",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    key_prefix = models.CharField(
        "prefijo de la key",
        max_length=16,
        blank=True,
        db_index=True,
        help_text="Solo para identificación (ej. hspy_AbCdEfGh).",
    )
    key_hash = models.CharField(
        "hash de la API Key",
        max_length=64,
        blank=True,
        db_index=True,
    )
    notes = models.TextField("notas internas", blank=True)
    last_used_at = models.DateTimeField("último uso", null=True, blank=True)
    request_count = models.PositiveIntegerField("requests", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "cliente de integración"
        verbose_name_plural = "clientes de integración"

    def __str__(self) -> str:
        return f"{self.name} ({self.get_status_display()})"

    @property
    def is_usable(self) -> bool:
        return self.status == self.Status.ACTIVE and bool(self.key_hash)

    def assign_new_key(self) -> str:
        """Genera y guarda una key nueva. Devuelve el valor en texto plano (una sola vez)."""
        raw = generate_api_key()
        self.key_prefix = key_display_prefix(raw)
        self.key_hash = hash_api_key(raw)
        self.save(update_fields=["key_prefix", "key_hash", "updated_at"])
        return raw

    def revoke(self) -> None:
        self.status = self.Status.REVOKED
        self.save(update_fields=["status", "updated_at"])

    def activate(self) -> None:
        self.status = self.Status.ACTIVE
        self.save(update_fields=["status", "updated_at"])

    def mark_used(self) -> None:
        type(self).objects.filter(pk=self.pk).update(
            last_used_at=timezone.now(),
            request_count=models.F("request_count") + 1,
            updated_at=timezone.now(),
        )


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
