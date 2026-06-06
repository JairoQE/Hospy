import re
import uuid

import requests
from django.conf import settings

from .base import GatewayChargeResult, PaymentGatewayError

MP_API = "https://api.mercadopago.com"


def _access_token() -> str:
    token = getattr(settings, "MP_ACCESS_TOKEN", "").strip()
    if not token:
        raise PaymentGatewayError(
            "Mercado Pago no está configurado (falta MP_ACCESS_TOKEN)."
        )
    return token


def _public_key() -> str:
    public_key = getattr(settings, "MP_PUBLIC_KEY", "").strip()
    if not public_key:
        raise PaymentGatewayError(
            "Mercado Pago no está configurado (falta MP_PUBLIC_KEY)."
        )
    return public_key


def _amount_pen(amount_cents: int) -> float:
    return round(amount_cents / 100, 2)


def _mp_error(response: requests.Response) -> PaymentGatewayError:
    try:
        data = response.json()
    except ValueError:
        data = {}
    message = "Error al procesar el pago."
    if isinstance(data, dict):
        message = (
            data.get("message")
            or (data.get("cause") or [{}])[0].get("description")
            if isinstance(data.get("cause"), list) and data.get("cause")
            else data.get("error")
            or message
        )
    return PaymentGatewayError(str(message), raw=data if isinstance(data, dict) else {})


def _normalize_phone(phone: str) -> str:
    phone_digits = re.sub(r"\D", "", phone or "")
    if len(phone_digits) == 11 and phone_digits.startswith("51"):
        phone_digits = phone_digits[2:]
    if len(phone_digits) != 9 or not phone_digits.startswith("9"):
        raise PaymentGatewayError("Ingresa un celular peruano válido (9 dígitos).")
    return phone_digits


def _create_yape_token(*, phone: str, otp: str) -> str:
    if not re.fullmatch(r"\d{6}", otp or ""):
        raise PaymentGatewayError("El código de aprobación debe tener 6 dígitos.")

    payload = {
        "phoneNumber": _normalize_phone(phone),
        "otp": otp.strip(),
        "requestId": str(uuid.uuid4()),
    }
    response = requests.post(
        f"{MP_API}/platforms/pci/yape/v1/payment",
        params={"public_key": _public_key()},
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    if response.status_code >= 400:
        raise _mp_error(response)
    data = response.json()
    token = data.get("id") or data.get("token")
    if not token:
        raise PaymentGatewayError("No se pudo crear el token Yape.", raw=data)
    return str(token)


def _create_payment(
    *,
    amount_cents: int,
    email: str,
    description: str,
    token: str | None = None,
    payment_method_id: str | None = None,
) -> GatewayChargeResult:
    payload: dict = {
        "transaction_amount": _amount_pen(amount_cents),
        "description": description[:200],
        "installments": 1,
        "payer": {"email": email},
    }
    if token:
        payload["token"] = token
    if payment_method_id:
        payload["payment_method_id"] = payment_method_id

    response = requests.post(
        f"{MP_API}/v1/payments",
        json=payload,
        headers={
            "Authorization": f"Bearer {_access_token()}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": str(uuid.uuid4()),
        },
        timeout=30,
    )
    if response.status_code >= 400:
        raise _mp_error(response)
    data = response.json()
    status = data.get("status", "")
    payment_id = str(data.get("id", ""))
    if status not in ("approved", "pending", "in_process"):
        detail = data.get("status_detail") or "Pago rechazado."
        raise PaymentGatewayError(str(detail), raw=data)

    message = "Pago procesado correctamente."
    if status == "pending":
        message = "Pago pendiente de confirmación."

    return GatewayChargeResult(
        ok=True,
        charge_id=payment_id,
        user_message=message,
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
    token = _create_yape_token(phone=phone, otp=otp)
    return _create_payment(
        amount_cents=amount_cents,
        email=email,
        description=description,
        token=token,
        payment_method_id="yape",
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
    return _create_payment(
        amount_cents=amount_cents,
        email=email,
        description=description,
        token=token,
    )


def create_pagoefectivo_order(
    *,
    amount_cents: int,
    email: str,
    description: str,
) -> GatewayChargeResult:
    response = requests.post(
        f"{MP_API}/v1/payments",
        json={
            "transaction_amount": _amount_pen(amount_cents),
            "description": description[:200],
            "payment_method_id": "pagoefectivo_atm",
            "payer": {"email": email},
        },
        headers={
            "Authorization": f"Bearer {_access_token()}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": str(uuid.uuid4()),
        },
        timeout=30,
    )
    if response.status_code >= 400:
        raise _mp_error(response)
    data = response.json()
    payment_id = str(data.get("id", ""))
    poi = data.get("point_of_interaction") or {}
    transaction_data = poi.get("transaction_data") or {}
    cip = transaction_data.get("ticket_url") or transaction_data.get("qr_code") or payment_id
    return GatewayChargeResult(
        ok=True,
        order_id=payment_id,
        user_message=f"Pago pendiente. Sigue las instrucciones: {cip}",
        raw=data,
    )
