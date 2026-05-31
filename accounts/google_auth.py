"""Autenticación con Google Identity Services (ID token)."""

from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework.exceptions import ValidationError

from accounts.social_auth import resolve_social_user

User = get_user_model()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()


def verify_google_credential(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise ValidationError(
            {
                "detail": (
                    "El inicio de sesión con Google no está configurado en el servidor. "
                    "Contacta al administrador."
                )
            }
        )
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise ValidationError(
            {"credential": "Token de Google inválido o expirado. Vuelve a intentarlo."}
        ) from exc

    issuer = idinfo.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValidationError({"credential": "Emisor del token no válido."})

    if not idinfo.get("email_verified"):
        raise ValidationError(
            {"credential": "Tu correo de Google debe estar verificado para usar Hospy."}
        )

    return idinfo


def _names_from_idinfo(idinfo: dict) -> tuple[str, str]:
    first = (idinfo.get("given_name") or "").strip()
    last = (idinfo.get("family_name") or "").strip()
    if not first and idinfo.get("name"):
        parts = str(idinfo["name"]).split(None, 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ""
    if not first:
        first = "Usuario"
    return first[:150], last[:150]


def resolve_google_user(idinfo: dict, role_intent: str) -> tuple[User, bool]:
    first_name, last_name = _names_from_idinfo(idinfo)
    return resolve_social_user(
        provider="google",
        external_id=idinfo["sub"],
        email=idinfo["email"],
        first_name=first_name,
        last_name=last_name,
        role_intent=role_intent,
    )
