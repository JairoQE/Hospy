import re

import requests
from django.conf import settings

from .base import GatewayChargeResult, PaymentGatewayError

CULQI_API = "https://api.culqi.com/v2"


def _headers() -> dict[str, str]:
    secret = getattr(settings, "CULQI_SECRET_KEY", "").strip()
    if not secret:
        raise PaymentGatewayError("Culqi no está configurado (falta CULQI_SECRET_KEY).")
    return {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def _culqi_error(response: requests.Response) -> PaymentGatewayError:
    try:
        data = response.json()
    except ValueError:
        data = {}
    message = (
        data.get("user_message")
        or data.get("merchant_message")
        or data.get("type")
        or response.text
        or "Error al procesar el pago."
    )
    return PaymentGatewayError(str(message), raw=data if isinstance(data, dict) else {})


def _create_yape_token(*, amount_cents: int, phone: str, otp: str) -> str:
    phone_digits = re.sub(r"\D", "", phone or "")
    if len(phone_digits) == 11 and phone_digits.startswith("51"):
        phone_digits = phone_digits[2:]
    if len(phone_digits) != 9 or not phone_digits.startswith("9"):
        raise PaymentGatewayError("Ingresa un celular peruano válido (9 dígitos).")

    payload = {
        "number_phone": phone_digits,
        "otp": otp.strip(),
        "amount": str(amount_cents),
    }
    response = requests.post(
        f"{CULQI_API}/tokens/yape",
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    if response.status_code >= 400:
        raise _culqi_error(response)
    data = response.json()
    token_id = data.get("id")
    if not token_id:
        raise PaymentGatewayError("No se pudo crear el token Yape.", raw=data)
    return token_id


def _create_charge(
    *,
    amount_cents: int,
    source_id: str,
    email: str,
    description: str,
) -> GatewayChargeResult:
    payload = {
        "amount": amount_cents,
        "currency_code": "PEN",
        "email": email,
        "source_id": source_id,
        "capture": True,
        "description": description[:200],
    }
    response = requests.post(
        f"{CULQI_API}/charges",
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    if response.status_code >= 400:
        raise _culqi_error(response)
    data = response.json()
    charge_id = data.get("id", "")
    outcome = (data.get("outcome") or {}).get("type", "")
    if outcome and outcome != "venta_exitosa":
        message = (data.get("outcome") or {}).get("user_message") or "Pago rechazado."
        raise PaymentGatewayError(message, raw=data)
    return GatewayChargeResult(
        ok=True,
        charge_id=charge_id,
        user_message="Pago procesado correctamente.",
        raw=data,
    )


def charge_yape(
    *,
    amount_cents: int,
    phone: str,
    otp: str,
    email: str,
    description: str,
) -> GatewayChargeResult:
    token_id = _create_yape_token(amount_cents=amount_cents, phone=phone, otp=otp)
    return _create_charge(
        amount_cents=amount_cents,
        source_id=token_id,
        email=email,
        description=description,
    )


def charge_card(
    *,
    amount_cents: int,
    source_id: str,
    email: str,
    description: str,
) -> GatewayChargeResult:
    token = (source_id or "").strip()
    if not token:
        raise PaymentGatewayError("Falta el token de la tarjeta.")
    return _create_charge(
        amount_cents=amount_cents,
        source_id=token,
        email=email,
        description=description,
    )


def create_pagoefectivo_order(
    *,
    amount_cents: int,
    email: str,
    description: str,
) -> GatewayChargeResult:
    payload = {
        "amount": amount_cents,
        "currency_code": "PEN",
        "description": description[:200],
        "order_number": f"hospy-{amount_cents}",
        "client_details": {
            "email": email,
        },
        "expiration_date": None,
    }
    response = requests.post(
        f"{CULQI_API}/orders",
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    if response.status_code >= 400:
        raise _culqi_error(response)
    data = response.json()
    order_id = data.get("id", "")
    cip = (data.get("payment_code") or data.get("cuotealo") or "") or order_id
    return GatewayChargeResult(
        ok=True,
        order_id=order_id,
        user_message=f"Genera tu pago con el código: {cip}",
        raw=data,
    )
