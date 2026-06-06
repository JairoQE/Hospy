import re

from .base import GatewayChargeResult, PaymentGatewayError

_MOCK_YAPE_OTP = "123456"
_MOCK_CARD_PREFIX = "tkn_test_"


def charge_yape(
    *,
    amount_cents: int,
    phone: str,
    otp: str,
    email: str,
    description: str,
) -> GatewayChargeResult:
    phone_digits = re.sub(r"\D", "", phone or "")
    if len(phone_digits) != 9 or not phone_digits.startswith("9"):
        raise PaymentGatewayError("Ingresa un celular peruano válido (9 dígitos).")
    if not re.fullmatch(r"\d{6}", otp or ""):
        raise PaymentGatewayError("El código de aprobación debe tener 6 dígitos.")
    if otp != _MOCK_YAPE_OTP:
        raise PaymentGatewayError(
            "Código de aprobación inválido o expirado. "
            f"En modo prueba usa {_MOCK_YAPE_OTP}."
        )
    return GatewayChargeResult(
        ok=True,
        charge_id=f"mock_yape_{phone_digits}_{amount_cents}",
        user_message="Pago Yape simulado correctamente.",
        raw={"mode": "mock", "method": "yape"},
    )


def charge_card(
    *,
    amount_cents: int,
    source_id: str,
    email: str,
    description: str,
) -> GatewayChargeResult:
    token = (source_id or "").strip()
    if not token.startswith(("tkn_test_", "tkn_live_", "crd_test_", "crd_live_")):
        raise PaymentGatewayError(
            "Token de tarjeta inválido. En modo prueba usa tkn_test_mock."
        )
    return GatewayChargeResult(
        ok=True,
        charge_id=f"mock_card_{token}_{amount_cents}",
        user_message="Pago con tarjeta simulado correctamente.",
        raw={"mode": "mock", "method": "card", "source_id": token},
    )


def create_pagoefectivo_order(
    *,
    amount_cents: int,
    email: str,
    description: str,
    external_reference: str = "",
) -> GatewayChargeResult:
    cip = f"9{amount_cents % 10000000:07d}"
    return GatewayChargeResult(
        ok=True,
        order_id=f"mock_pe_{cip}",
        user_message=f"Código PagoEfectivo simulado: {cip}",
        raw={"mode": "mock", "method": "pagoefectivo", "cip": cip},
    )
