"""Autenticación con Facebook Login (access token + Graph API)."""

from __future__ import annotations

import os

import requests
from rest_framework.exceptions import ValidationError

from accounts.social_auth import resolve_social_user

GRAPH_API_VERSION = "v21.0"


def _facebook_credentials() -> tuple[str, str]:
    """Lee credenciales en cada petición (el .env no dispara autoreload de Django)."""
    app_id = os.environ.get("FACEBOOK_APP_ID", "").strip()
    app_secret = os.environ.get("FACEBOOK_APP_SECRET", "").strip()
    return app_id, app_secret


def verify_facebook_access_token(access_token: str) -> dict:
    facebook_app_id, facebook_app_secret = _facebook_credentials()
    if not facebook_app_id or not facebook_app_secret:
        raise ValidationError(
            {
                "detail": (
                    "El inicio de sesión con Facebook no está configurado en el servidor. "
                    "Contacta al administrador."
                )
            }
        )

    app_token = f"{facebook_app_id}|{facebook_app_secret}"
    try:
        debug_res = requests.get(
            f"https://graph.facebook.com/{GRAPH_API_VERSION}/debug_token",
            params={"input_token": access_token, "access_token": app_token},
            timeout=12,
        )
        debug_res.raise_for_status()
        debug_data = debug_res.json().get("data") or {}
    except requests.RequestException as exc:
        raise ValidationError(
            {"access_token": "No se pudo validar el token de Facebook."}
        ) from exc

    if not debug_data.get("is_valid"):
        raise ValidationError(
            {"access_token": "Token de Facebook inválido o expirado."}
        )

    if str(debug_data.get("app_id")) != facebook_app_id:
        raise ValidationError({"access_token": "El token no pertenece a esta aplicación."})

    try:
        profile_res = requests.get(
            f"https://graph.facebook.com/{GRAPH_API_VERSION}/me",
            params={
                "fields": "id,email,first_name,last_name,name",
                "access_token": access_token,
            },
            timeout=12,
        )
        profile_res.raise_for_status()
        profile = profile_res.json()
    except requests.RequestException as exc:
        raise ValidationError(
            {"access_token": "No se pudo obtener tu perfil de Facebook."}
        ) from exc

    if profile.get("error"):
        raise ValidationError(
            {"access_token": profile["error"].get("message", "Error de Facebook.")}
        )

    if not profile.get("email"):
        raise ValidationError(
            {
                "detail": (
                    "Facebook no compartió tu correo. "
                    "Al iniciar sesión, acepta el permiso de email o usa otro método."
                )
            }
        )

    return profile


def _names_from_profile(profile: dict) -> tuple[str, str]:
    first = (profile.get("first_name") or "").strip()
    last = (profile.get("last_name") or "").strip()
    if not first and profile.get("name"):
        parts = str(profile["name"]).split(None, 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ""
    return first, last


def resolve_facebook_user(profile: dict, role_intent: str):
    first_name, last_name = _names_from_profile(profile)
    return resolve_social_user(
        provider="facebook",
        external_id=str(profile["id"]),
        email=profile["email"],
        first_name=first_name,
        last_name=last_name,
        role_intent=role_intent,
    )
