import re

from django.contrib.auth import get_user_model

User = get_user_model()

DNI_RE = re.compile(r"^\d{8}$")
PAYOUT_INCOMPLETE_MESSAGE = (
    "El anfitrión aún no completó sus datos de cobro. "
    "Esta hospedaje no acepta reservas pagadas por ahora."
)


def normalize_dni(value: str) -> str:
    return (value or "").strip().replace(" ", "")


def validate_dni(value: str) -> str:
    normalized = normalize_dni(value)
    if not DNI_RE.match(normalized):
        raise ValueError("Ingresa un DNI válido de 8 dígitos.")
    return normalized


def owner_payout_missing_fields(user) -> list[str]:
    if user.role != User.Role.PROPIETARIO:
        return []
    missing: list[str] = []
    if not (user.phone or "").strip():
        missing.append("phone")
    if not normalize_dni(getattr(user, "payout_document_number", "")):
        missing.append("payout_document_number")
    elif not DNI_RE.match(normalize_dni(user.payout_document_number)):
        missing.append("payout_document_number")
    if not (getattr(user, "payout_mp_email", "") or "").strip():
        missing.append("payout_mp_email")
    return missing


def owner_has_complete_payout_profile(user) -> bool:
    return not owner_payout_missing_fields(user)
