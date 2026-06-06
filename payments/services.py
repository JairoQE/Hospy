from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from bookings.services import confirm_booking

from .gateways import culqi, mercadopago, mock
from .gateways.base import GatewayChargeResult, PaymentGatewayError
from .models import Payment

PAYMENT_EXPIRY_MINUTES = int(getattr(settings, "PAYMENT_EXPIRY_MINUTES", 30))


def _amount_cents(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


def get_gateway_name() -> str:
    configured = getattr(settings, "PAYMENTS_GATEWAY", "mock").strip().lower()
    if configured == "mercadopago":
        token = getattr(settings, "MP_ACCESS_TOKEN", "").strip()
        public_key = getattr(settings, "MP_PUBLIC_KEY", "").strip()
        if token and public_key:
            return "mercadopago"
    if configured == "culqi" and getattr(settings, "CULQI_SECRET_KEY", "").strip():
        return "culqi"
    return "mock"


def get_gateway_module():
    name = get_gateway_name()
    if name == "culqi":
        return culqi
    if name == "mercadopago":
        return mercadopago
    return mock


def get_available_methods() -> list[dict]:
    gateway = get_gateway_name()
    methods = [
        {
            "id": "yape",
            "label": "Yape",
            "description": "Paga con código de aprobación desde tu app Yape.",
            "enabled": True,
        },
        {
            "id": "card",
            "label": "Tarjeta",
            "description": "Visa, Mastercard, débito o crédito.",
            "enabled": True,
        },
        {
            "id": "pagoefectivo",
            "label": "PagoEfectivo",
            "description": "Paga en agentes, bodegas o banca móvil.",
            "enabled": gateway in ("culqi", "mercadopago"),
        },
        {
            "id": "plin",
            "label": "Plin",
            "description": "Próximamente disponible en checkout.",
            "enabled": False,
        },
    ]
    return methods


def create_payment_for_booking(booking: Booking) -> Payment:
    if hasattr(booking, "payment"):
        payment = booking.payment
        if payment.status == Payment.Status.PAGADO:
            raise ValueError("Esta reserva ya fue pagada.")
        if payment.status == Payment.Status.PENDIENTE:
            return payment
    expires_at = timezone.now() + timedelta(minutes=PAYMENT_EXPIRY_MINUTES)
    return Payment.objects.create(
        booking=booking,
        guest=booking.guest,
        amount=booking.total_amount,
        currency="PEN",
        status=Payment.Status.PENDIENTE,
        gateway=get_gateway_name(),
        expires_at=expires_at,
    )


def _ensure_payable(payment: Payment, user) -> None:
    if payment.guest_id != user.id:
        raise ValueError("No tienes permiso para pagar esta reserva.")
    if payment.booking.status != Booking.Status.PENDIENTE:
        raise ValueError("Esta reserva ya no admite pago.")
    if payment.status == Payment.Status.PAGADO:
        raise ValueError("Esta reserva ya fue pagada.")
    if payment.expires_at and timezone.now() > payment.expires_at:
        payment.status = Payment.Status.EXPIRADO
        payment.save(update_fields=["status", "updated_at"])
        raise ValueError("El plazo para pagar expiró. Crea una nueva reserva.")
    if payment.status not in (Payment.Status.PENDIENTE, Payment.Status.FALLIDO):
        raise ValueError("Este pago no puede procesarse en su estado actual.")


def _mark_success(payment: Payment, result: GatewayChargeResult, method: str) -> Payment:
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        payment.method = method
        payment.status = Payment.Status.PAGADO
        payment.gateway_charge_id = result.charge_id or payment.gateway_charge_id
        payment.gateway_order_id = result.order_id or payment.gateway_order_id
        payment.failure_message = ""
        payment.paid_at = timezone.now()
        payment.gateway = get_gateway_name()
        payment.save(
            update_fields=[
                "method",
                "status",
                "gateway_charge_id",
                "gateway_order_id",
                "failure_message",
                "paid_at",
                "gateway",
                "updated_at",
            ]
        )
        booking = payment.booking
        if booking.status == Booking.Status.PENDIENTE:
            confirm_booking(booking)
    return payment


def _mark_failure(payment: Payment, message: str, method: str) -> Payment:
    payment.method = method
    payment.status = Payment.Status.FALLIDO
    payment.failure_message = message[:255]
    payment.save(update_fields=["method", "status", "failure_message", "updated_at"])
    return payment


def _charge_description(payment: Payment) -> str:
    acc = payment.booking.room.accommodation
    return f"Reserva Hospy #{payment.booking_id} — {acc.name}"


def pay_with_yape(payment: Payment, user, *, phone: str, otp: str) -> Payment:
    _ensure_payable(payment, user)
    payment.status = Payment.Status.PROCESANDO
    payment.method = Payment.Method.YAPE
    payment.save(update_fields=["status", "method", "updated_at"])

    gateway = get_gateway_module()
    amount_cents = _amount_cents(payment.amount)
    try:
        result = gateway.charge_yape(
            amount_cents=amount_cents,
            phone=phone,
            otp=otp,
            email=user.email,
            description=_charge_description(payment),
        )
        return _mark_success(payment, result, Payment.Method.YAPE)
    except PaymentGatewayError as exc:
        return _mark_failure(payment, str(exc), Payment.Method.YAPE)


def pay_with_card(payment: Payment, user, *, source_id: str) -> Payment:
    _ensure_payable(payment, user)
    payment.status = Payment.Status.PROCESANDO
    payment.method = Payment.Method.CARD
    payment.save(update_fields=["status", "method", "updated_at"])

    gateway = get_gateway_module()
    amount_cents = _amount_cents(payment.amount)
    try:
        result = gateway.charge_card(
            amount_cents=amount_cents,
            source_id=source_id,
            email=user.email,
            description=_charge_description(payment),
        )
        return _mark_success(payment, result, Payment.Method.CARD)
    except PaymentGatewayError as exc:
        return _mark_failure(payment, str(exc), Payment.Method.CARD)


def create_pagoefectivo(payment: Payment, user) -> tuple[Payment, str]:
    _ensure_payable(payment, user)
    gateway_name = get_gateway_name()
    if gateway_name == "mock":
        gateway = mock
        amount_cents = _amount_cents(payment.amount)
        result = gateway.create_pagoefectivo_order(
            amount_cents=amount_cents,
            email=user.email,
            description=_charge_description(payment),
        )
        payment.method = Payment.Method.PAGOEFECTIVO
        payment.gateway_order_id = result.order_id
        payment.failure_message = result.user_message
        payment.save(
            update_fields=["method", "gateway_order_id", "failure_message", "updated_at"]
        )
        return payment, result.user_message

    gateway = get_gateway_module()
    amount_cents = _amount_cents(payment.amount)
    try:
        result = gateway.create_pagoefectivo_order(
            amount_cents=amount_cents,
            email=user.email,
            description=_charge_description(payment),
        )
        payment.method = Payment.Method.PAGOEFECTIVO
        payment.gateway_order_id = result.order_id
        payment.failure_message = result.user_message
        payment.save(
            update_fields=["method", "gateway_order_id", "failure_message", "updated_at"]
        )
        return payment, result.user_message
    except PaymentGatewayError as exc:
        _mark_failure(payment, str(exc), Payment.Method.PAGOEFECTIVO)
        raise ValueError(str(exc)) from exc
