"""Ajustes locales para pruebas RFt-1-G (evitación de fallos)."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.test import override_settings

from bookings.models import Booking
from payments.models import Payment
from payments.services import create_payment_for_booking


@pytest.fixture(autouse=True)
def fault_tolerance_settings():
    with override_settings(
        HOSPY_INTEGRATION_API_KEY="test-integration-key",
        TURNSTILE_SECRET_KEY="",
        TURNSTILE_SITE_KEY="",
    ):
        yield


@pytest.fixture
def reserva_pendiente_con_pago(db, huesped, hospedaje_aprobado):
    """Reserva pendiente con pago asociado."""
    _, room = hospedaje_aprobado
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=check_in,
        check_out=check_out,
        total_amount="200.00",
        status=Booking.Status.PENDIENTE,
    )
    payment = create_payment_for_booking(booking)
    return booking, payment


@pytest.fixture
def reserva_cancelada_con_reembolso(db, huesped, hospedaje_aprobado):
    """Reserva cancelada con registro de reembolso pendiente."""
    from bookings.refund_services import create_refund_on_cancel

    _, room = hospedaje_aprobado
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=check_in,
        check_out=check_out,
        total_amount=Decimal("200.00"),
        status=Booking.Status.CANCELADA,
    )
    create_payment_for_booking(booking)
    create_refund_on_cancel(booking)
    booking.refresh_from_db()
    return booking
