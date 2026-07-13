"""Autenticación de clientes de integración por API Key."""

from __future__ import annotations

import hmac
from dataclasses import dataclass

from django.conf import settings

from .api_keys import hash_api_key
from .models import IntegrationClient


@dataclass(frozen=True)
class IntegrationAuthResult:
    """Cliente autenticado o modo legacy (variable de entorno)."""

    client: IntegrationClient | None
    legacy_env: bool = False

    @property
    def label(self) -> str:
        if self.client is not None:
            return self.client.name
        if self.legacy_env:
            return "legacy-env-key"
        return ""


def authenticate_integration_key(raw_key: str) -> IntegrationAuthResult | None:
    """
    Valida el header X-Hospy-Integration-Key.

    Orden:
    1) Clientes activos con key hasheada en BD
    2) Fallback a HOSPY_INTEGRATION_API_KEY (compatibilidad / demo)
    """
    key = (raw_key or "").strip()
    if not key:
        return None

    digest = hash_api_key(key)
    client = (
        IntegrationClient.objects.filter(
            status=IntegrationClient.Status.ACTIVE,
            key_hash=digest,
        )
        .select_related("owner")
        .first()
    )
    if client is not None:
        return IntegrationAuthResult(client=client, legacy_env=False)

    expected = (getattr(settings, "HOSPY_INTEGRATION_API_KEY", "") or "").strip()
    if expected and hmac.compare_digest(key.encode("utf-8"), expected.encode("utf-8")):
        return IntegrationAuthResult(client=None, legacy_env=True)

    return None
