"""Registro de acceso a la API de integración (monitoreo + auditoría)."""

from __future__ import annotations

from audit.services import log_action


def record_integration_access(request, *, response_status: int | None = None) -> None:
    auth = getattr(request, "integration_auth", None)
    if auth is None:
        return

    client = auth.client
    if client is not None:
        client.mark_used()
        target_id = client.pk
        target_label = client.name
        meta = {
            "integration_client_id": client.pk,
            "integration_client_name": client.name,
            "integration_client_email": client.contact_email,
            "integration_organization": client.organization,
            "key_prefix": client.key_prefix,
            "auth_mode": "registered_client",
        }
    else:
        target_id = None
        target_label = "legacy-env-key"
        meta = {
            "integration_client_name": "legacy-env-key",
            "auth_mode": "legacy_env",
        }

    meta.update(
        {
            "path": getattr(request, "path", ""),
            "method": getattr(request, "method", ""),
            "query": dict(getattr(request, "query_params", {}) or {}),
            "response_status": response_status,
        }
    )

    log_action(
        actor=None,
        action="integration.api.access",
        target_type="IntegrationClient",
        target_id=target_id,
        target_label=target_label,
        metadata=meta,
        request=request,
    )
