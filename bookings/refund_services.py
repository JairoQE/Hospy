from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from properties.refund_policy import estimate_refund_percent

from .models import Booking, BookingRefund

REFUND_MAX_PROCESSING_DAYS = 7


def guest_cancel_hours_for(accommodation) -> int:
    import os

    default = int(os.environ.get("BOOKING_CANCEL_HOURS_BEFORE_CHECKIN", "48"))
    hours = getattr(accommodation, "cancel_hours_before_checkin", None)
    if hours is not None and hours > 0:
        return int(hours)
    return default


def refund_processing_days_for(accommodation) -> int:
    days = getattr(accommodation, "refund_processing_days", None) or 3
    return max(1, min(int(days), REFUND_MAX_PROCESSING_DAYS))


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def create_refund_on_cancel(booking: Booking) -> BookingRefund | None:
    """Crea registro de reembolso indirecto al cancelar una reserva."""
    if hasattr(booking, "refund"):
        return booking.refund

    acc = booking.room.accommodation
    estimate = estimate_refund_percent(acc, check_in=booking.check_in)
    percent = estimate.percent

    if percent is None or percent <= 0:
        return BookingRefund.objects.create(
            booking=booking,
            status=BookingRefund.Status.NO_APLICA,
            refund_percent=0 if percent == 0 else None,
            refund_amount=Decimal("0.00"),
        )

    amount = _quantize_money(booking.total_amount * Decimal(percent) / Decimal(100))
    days = refund_processing_days_for(acc)
    due_at = timezone.now() + timedelta(days=days)

    return BookingRefund.objects.create(
        booking=booking,
        status=BookingRefund.Status.PENDIENTE,
        refund_percent=percent,
        refund_amount=amount,
        due_at=due_at,
    )


def _get_refund(booking: Booking) -> BookingRefund:
    try:
        return booking.refund
    except BookingRefund.DoesNotExist as exc:
        raise ValueError("Esta reserva no tiene reembolso registrado.") from exc


def owner_register_refund(
    booking: Booking,
    owner,
    *,
    operation_number: str,
    reported_amount,
) -> BookingRefund:
    if booking.room.accommodation.owner_id != owner.id:
        raise ValueError("No tienes permiso para registrar el reembolso.")
    if booking.status != Booking.Status.CANCELADA:
        raise ValueError("Solo aplica a reservas canceladas.")

    refund = _get_refund(booking)
    if refund.status not in (
        BookingRefund.Status.PENDIENTE,
        BookingRefund.Status.DISPUTADO,
    ):
        raise ValueError("Este reembolso ya no admite registro del anfitrión.")
    if refund.status == BookingRefund.Status.NO_APLICA or refund.refund_amount <= 0:
        raise ValueError("Esta reserva no tiene reembolso pendiente.")

    op = (operation_number or "").strip()
    if len(op) < 4:
        raise ValueError("Ingresa un número de operación válido (mínimo 4 caracteres).")
    amount = Decimal(str(reported_amount))
    if amount <= 0:
        raise ValueError("El monto debe ser mayor a cero.")

    with transaction.atomic():
        refund = BookingRefund.objects.select_for_update().get(pk=refund.pk)
        refund.owner_operation_number = op
        refund.owner_reported_amount = amount
        refund.owner_reported_at = timezone.now()
        refund.status = BookingRefund.Status.REPORTADO
        refund.save(
            update_fields=[
                "owner_operation_number",
                "owner_reported_amount",
                "owner_reported_at",
                "status",
                "updated_at",
            ]
        )
    return refund


def guest_confirm_refund(booking: Booking, guest) -> BookingRefund:
    if booking.guest_id != guest.id:
        raise ValueError("No tienes permiso para confirmar este reembolso.")

    refund = _get_refund(booking)
    if refund.status != BookingRefund.Status.REPORTADO:
        raise ValueError("No hay un reembolso reportado por el anfitrión para confirmar.")

    with transaction.atomic():
        refund = BookingRefund.objects.select_for_update().get(pk=refund.pk)
        refund.status = BookingRefund.Status.CONFIRMADO
        refund.guest_confirmed_at = timezone.now()
        refund.save(update_fields=["status", "guest_confirmed_at", "updated_at"])
    return refund


def guest_dispute_refund(booking: Booking, guest, *, notes: str = "") -> BookingRefund:
    if booking.guest_id != guest.id:
        raise ValueError("No tienes permiso para reportar este reembolso.")

    refund = _get_refund(booking)
    if refund.status == BookingRefund.Status.NO_APLICA:
        raise ValueError("Esta reserva no tiene reembolso.")
    if refund.status == BookingRefund.Status.CONFIRMADO:
        raise ValueError("El reembolso ya fue confirmado.")
    if refund.status == BookingRefund.Status.DISPUTADO:
        raise ValueError("Ya reportaste este caso al administrador.")

    now = timezone.now()
    if refund.status == BookingRefund.Status.PENDIENTE:
        if refund.due_at and now < refund.due_at:
            raise ValueError(
                "Aún estás dentro del plazo del anfitrión. Espera hasta la fecha límite o "
                "contacta al anfitrión antes de reportar."
            )

    with transaction.atomic():
        refund = BookingRefund.objects.select_for_update().get(pk=refund.pk)
        refund.status = BookingRefund.Status.DISPUTADO
        refund.dispute_notes = (notes or "").strip()
        refund.disputed_at = now
        refund.save(
            update_fields=["status", "dispute_notes", "disputed_at", "updated_at"]
        )
    return refund


def serialize_refund(refund: BookingRefund | None) -> dict | None:
    if refund is None:
        return None
    return {
        "status": refund.status,
        "refund_percent": refund.refund_percent,
        "refund_amount": str(refund.refund_amount),
        "due_at": refund.due_at.isoformat() if refund.due_at else None,
        "owner_operation_number": refund.owner_operation_number or "",
        "owner_reported_amount": (
            str(refund.owner_reported_amount)
            if refund.owner_reported_amount is not None
            else None
        ),
        "owner_reported_at": (
            refund.owner_reported_at.isoformat() if refund.owner_reported_at else None
        ),
        "guest_confirmed_at": (
            refund.guest_confirmed_at.isoformat() if refund.guest_confirmed_at else None
        ),
        "dispute_notes": refund.dispute_notes or "",
        "disputed_at": refund.disputed_at.isoformat() if refund.disputed_at else None,
        "can_owner_register": refund.status
        in (BookingRefund.Status.PENDIENTE, BookingRefund.Status.DISPUTADO)
        and refund.refund_amount > 0,
        "can_guest_confirm": refund.status == BookingRefund.Status.REPORTADO,
        "can_guest_dispute": refund.status
        in (BookingRefund.Status.PENDIENTE, BookingRefund.Status.REPORTADO)
        and refund.refund_amount > 0
        and (
            refund.status == BookingRefund.Status.REPORTADO
            or (refund.due_at and timezone.now() >= refund.due_at)
        ),
    }
