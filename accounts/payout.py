import re

from django.contrib.auth import get_user_model

User = get_user_model()

DNI_RE = re.compile(r"^\d{8}$")
CCI_RE = re.compile(r"^\d{20}$")

PAYOUT_INCOMPLETE_MESSAGE = (
    "El anfitrión aún no completó sus datos básicos de cobro (teléfono y DNI). "
    "Este hospedaje no acepta reservas por ahora."
)
PAYOUT_ONLINE_INCOMPLETE_MESSAGE = (
    "Este anfitrión no tiene configurado cobro en línea. "
    "Coordina el pago directamente con el anfitrión."
)


def normalize_dni(value: str) -> str:
    return (value or "").strip().replace(" ", "")


def normalize_cci(value: str) -> str:
    return (value or "").strip().replace(" ", "")


def validate_dni(value: str) -> str:
    normalized = normalize_dni(value)
    if not DNI_RE.match(normalized):
        raise ValueError("Ingresa un DNI válido de 8 dígitos.")
    return normalized


def owner_payout_missing_fields(user) -> list[str]:
    """Mínimo para aceptar reservas (incluye pago directo con anfitrión)."""
    if user.role != User.Role.PROPIETARIO:
        return []
    missing: list[str] = []
    if not (user.phone or "").strip():
        missing.append("phone")
    if not normalize_dni(getattr(user, "payout_document_number", "")):
        missing.append("payout_document_number")
    elif not DNI_RE.match(normalize_dni(user.payout_document_number)):
        missing.append("payout_document_number")
    return missing


def owner_online_payout_missing_fields(user) -> list[str]:
    """Requisitos adicionales para cobrar por la plataforma (Yape, tarjeta, etc.)."""
    missing = list(owner_payout_missing_fields(user))
    mp_email = (getattr(user, "payout_mp_email", "") or "").strip()
    cci = normalize_cci(getattr(user, "payout_bank_cci", ""))
    if not mp_email and not (cci and CCI_RE.match(cci)):
        missing.append("payout_online_method")
    return missing


def owner_has_complete_payout_profile(user) -> bool:
    return not owner_payout_missing_fields(user)


def owner_has_online_payout_profile(user) -> bool:
    return not owner_online_payout_missing_fields(user)
