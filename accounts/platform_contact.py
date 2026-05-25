"""Datos de contacto públicos del administrador de la plataforma."""

from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


def whatsapp_url(phone: str) -> tuple[str, str]:
    """Devuelve (número solo dígitos, URL wa.me) o vacío si no hay número."""
    digits = "".join(c for c in (phone or "") if c.isdigit())
    if not digits:
        return "", ""
    return digits, f"https://wa.me/{digits}"


def get_platform_admin_user():
    """
    Administrador de contacto público: prioriza quien tiene teléfono en su perfil
    (p. ej. el que editas en /perfil); si no, el superusuario más reciente.
    """
    admins = list(
        User.objects.filter(role=User.Role.ADMINISTRADOR, is_active=True).order_by(
            "-is_superuser", "-pk"
        )
    )
    if not admins:
        return None
    for user in admins:
        if (user.phone or "").strip():
            return user
    return admins[0]


def build_platform_contact_payload() -> dict[str, str]:
    """
    Email y teléfono del usuario administrador activo (prioriza superuser).
    WhatsApp: teléfono del admin o HOSPY_ADMIN_WHATSAPP en settings.
    """
    admin = get_platform_admin_user()
    email = ((admin.email if admin else "") or "").strip()
    phone = ((admin.phone if admin else "") or "").strip()

    wa_source = phone or getattr(settings, "HOSPY_ADMIN_WHATSAPP", "") or ""
    wa_digits, wa_url = whatsapp_url(wa_source)

    display_phone = phone
    if not display_phone and wa_digits:
        display_phone = f"+{wa_digits}" if not wa_digits.startswith("+") else wa_digits

    return {
        "admin_email": email,
        "admin_phone": display_phone,
        "admin_whatsapp": wa_digits or wa_source.strip(),
        "admin_whatsapp_url": wa_url,
    }
