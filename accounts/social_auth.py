"""Registro / login con proveedores OAuth (Google, Facebook)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from accounts.serializers import _unique_username_from_email

User = get_user_model()

PROVIDER_ID_FIELD = {
    "google": "google_id",
    "facebook": "facebook_id",
}


def resolve_social_user(
    provider: str,
    external_id: str,
    email: str,
    first_name: str,
    last_name: str,
    role_intent: str,
) -> tuple[User, bool]:
    """
    Devuelve (usuario, creado).
    role_intent: login | huesped | propietario | patrocinador
    """
    if provider not in PROVIDER_ID_FIELD:
        raise ValueError(f"Proveedor no soportado: {provider}")

    id_field = PROVIDER_ID_FIELD[provider]
    email = email.lower().strip()
    first_name = (first_name or "Usuario")[:150]
    last_name = (last_name or "")[:150]

    user = User.objects.filter(**{id_field: external_id}).first()
    if user:
        if not user.is_active:
            raise ValidationError({"detail": "Esta cuenta está desactivada."})
        return user, False

    user = User.objects.filter(email__iexact=email).first()
    if user:
        if not user.is_active:
            raise ValidationError({"detail": "Esta cuenta está desactivada."})
        existing_external = getattr(user, id_field)
        if existing_external and existing_external != external_id:
            label = "Google" if provider == "google" else "Facebook"
            raise ValidationError(
                {"detail": f"Este correo está vinculado a otra cuenta de {label}."}
            )
        if role_intent in ("propietario", "patrocinador") and user.role != role_intent:
            if user.role == User.Role.HUESPED:
                raise ValidationError(
                    {
                        "detail": (
                            "Este correo ya está registrado como huésped. "
                            "Inicia sesión con tu cuenta existente."
                        )
                    }
                )
            raise ValidationError(
                {
                    "detail": (
                        "Este correo ya tiene otra cuenta en Hospy. "
                        "Inicia sesión con tu cuenta existente."
                    )
                }
            )
        if not existing_external:
            setattr(user, id_field, external_id)
            user.save(update_fields=[id_field])
        return user, False

    if role_intent == "login":
        raise ValidationError(
            {
                "detail": (
                    "No hay cuenta con este correo. Regístrate primero en Hospy."
                )
            }
        )

    role_map = {
        "huesped": User.Role.HUESPED,
        "propietario": User.Role.PROPIETARIO,
        "patrocinador": User.Role.PATROCINADOR,
    }
    role = role_map.get(role_intent, User.Role.HUESPED)

    extra: dict = {id_field: external_id}
    if role == User.Role.PROPIETARIO:
        extra["owner_status"] = User.OwnerStatus.PENDIENTE
    elif role == User.Role.PATROCINADOR:
        extra["sponsor_status"] = User.SponsorStatus.PENDIENTE

    user = User(
        email=email,
        username=_unique_username_from_email(email),
        first_name=first_name,
        last_name=last_name,
        role=role,
        **extra,
    )
    user.set_unusable_password()
    user.save()
    return user, True
