import re

from django.contrib.auth import get_user_model

User = get_user_model()

DNI_RE = re.compile(r"^\d{8}$")
CCI_RE = re.compile(r"^\d{20}$")

PAYOUT_INCOMPLETE_MESSAGE = (
    "El anfitrión aún no completó sus datos de cobro en línea. "
    "Usa pago directo o coordina con el anfitrión."
)
PAYOUT_ONLINE_INCOMPLETE_MESSAGE = (
    "Este anfitrión no tiene configurado cobro en línea (Mercado Pago o CCI). "
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
    """Campos básicos opcionales del perfil de cobro (informativo)."""
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
    """Requisitos para cobrar por la plataforma (Yape, tarjeta, etc.)."""
    if user.role != User.Role.PROPIETARIO:
        return []
    missing: list[str] = []
    mp_email = (getattr(user, "payout_mp_email", "") or "").strip()
    cci = normalize_cci(getattr(user, "payout_bank_cci", ""))
    if not mp_email and not (cci and CCI_RE.match(cci)):
        missing.append("payout_online_method")
    return missing


def owner_has_complete_payout_profile(user) -> bool:
    return not owner_payout_missing_fields(user)


def owner_has_online_payout_profile(user) -> bool:
    return not owner_online_payout_missing_fields(user)
