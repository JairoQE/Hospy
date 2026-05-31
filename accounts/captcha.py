"""Verificación server-side de Cloudflare Turnstile (anti-bots / fuerza bruta)."""

from __future__ import annotations

import logging

import requests
from django.conf import settings
from rest_framework import serializers

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def captcha_enabled() -> bool:
    return bool(getattr(settings, "TURNSTILE_SECRET_KEY", "").strip())


def captcha_public_config() -> dict[str, str | bool]:
    enabled = captcha_enabled()
    site_key = getattr(settings, "TURNSTILE_SITE_KEY", "").strip() if enabled else ""
    return {"enabled": enabled, "site_key": site_key}


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def verify_captcha_token(token: str | None, *, request=None) -> None:
    """
    Valida el token de Turnstile. Si CAPTCHA está activo, falla cerrado:
    sin token, token inválido o error de red → rechazo.
    """
    if not captcha_enabled():
        return

    cleaned = (token or "").strip()
    if not cleaned:
        raise serializers.ValidationError(
            {"captcha_token": "Completa la verificación de seguridad."},
            code="captcha_required",
        )

    payload = {
        "secret": settings.TURNSTILE_SECRET_KEY.strip(),
        "response": cleaned,
    }
    ip = _client_ip(request)
    if ip:
        payload["remoteip"] = ip

    try:
        response = requests.post(TURNSTILE_VERIFY_URL, data=payload, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException:
        logger.exception("Turnstile verification request failed")
        raise serializers.ValidationError(
            {"captcha_token": "No se pudo verificar la seguridad. Inténtalo de nuevo."},
            code="captcha_unavailable",
        )

    if not data.get("success"):
        logger.info("Turnstile rejected token: %s", data.get("error-codes"))
        raise serializers.ValidationError(
            {"captcha_token": "Verificación de seguridad inválida o expirada."},
            code="captcha_invalid",
        )
