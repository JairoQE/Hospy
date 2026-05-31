from __future__ import annotations

from typing import Any

from .models import AuditLog


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def log_action(
    *,
    actor,
    action: str,
    target_type: str = "",
    target_id: int | None = None,
    target_label: str = "",
    metadata: dict[str, Any] | None = None,
    request=None,
) -> AuditLog:
    """Registra una acción relevante. Fallos de escritura no interrumpen el flujo principal."""
    actor_id = None
    actor_role = ""
    actor_email = ""
    actor_name = ""

    if actor is not None and getattr(actor, "is_authenticated", False):
        actor_id = actor.pk
        actor_role = getattr(actor, "role", "") or ""
        actor_email = getattr(actor, "email", "") or ""
        actor_name = (
            actor.get_full_name().strip()
            or getattr(actor, "username", "")
            or actor_email
        )

    ip = _client_ip(request)
    ua = ""
    if request is not None:
        ua = (request.META.get("HTTP_USER_AGENT") or "")[:500]

    try:
        return AuditLog.objects.create(
            actor_id=actor_id,
            actor_role=actor_role,
            actor_email=actor_email,
            actor_name=actor_name,
            action=action,
            target_type=target_type[:64],
            target_id=target_id,
            target_label=(target_label or "")[:255],
            metadata=metadata or {},
            ip_address=ip,
            user_agent=ua,
        )
    except Exception:
        return AuditLog()
