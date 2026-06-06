import pytest

from bookings.models import Booking
from payments.models import Payment


@pytest.mark.django_db
def test_yape_mock_payment(api_client, huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    _, room = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    booking_res = api_client.post(
        "/api/v1/reservas/",
        {
            "room": room.id,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        },
        format="json",
    )
    assert booking_res.status_code == 201
    booking_id = booking_res.data["id"]
    assert booking_res.data["payment"]["status"] == "pendiente"
    payment_id = booking_res.data["payment"]["id"]

    pay_res = api_client.post(
        f"/api/v1/pagos/{payment_id}/yape/",
        {"phone": "999888777", "otp": "123456"},
        format="json",
    )
    assert pay_res.status_code == 200
    assert pay_res.data["status"] == "pagado"

    booking = Booking.objects.get(pk=booking_id)
    assert booking.status == Booking.Status.CONFIRMADA
    payment = Payment.objects.get(pk=payment_id)
    assert payment.status == Payment.Status.PAGADO


@pytest.mark.django_db
def test_payment_methods_public(api_client):
    response = api_client.get("/api/v1/pagos/metodos/")
    assert response.status_code == 200
    assert response.data["gateway"] == "mock"
    ids = [m["id"] for m in response.data["methods"]]
    assert "yape" in ids
    assert "card" in ids
