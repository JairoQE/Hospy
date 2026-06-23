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
    assert "externo" in ids


@pytest.mark.django_db
def test_external_payment_flow(api_client, huesped, hospedaje_aprobado, propietario):
    from datetime import date, timedelta

    _, room = hospedaje_aprobado
    owner = room.accommodation.owner
    owner.payout_mp_email = ""
    owner.payout_bank_cci = ""
    owner.save()

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
    payment_id = booking_res.data["payment"]["id"]

    ext_res = api_client.post(
        f"/api/v1/pagos/{payment_id}/externo/",
        {"operation_number": "OP-123456", "reported_amount": "70.00"},
        format="json",
    )
    assert ext_res.status_code == 200
    assert ext_res.data["method"] == "externo"
    assert ext_res.data["status"] == "procesando"
    assert ext_res.data["external_operation_number"] == "OP-123456"
    assert ext_res.data["guest_reported_amount"] == "70.00"

    booking = Booking.objects.get(pk=booking_res.data["id"])
    assert booking.status == Booking.Status.PENDIENTE

    api_client.force_authenticate(user=owner)
    confirm_res = api_client.post(
        f"/api/v1/pagos/{payment_id}/confirmar-externo/",
        {},
        format="json",
    )
    assert confirm_res.status_code == 200
    assert confirm_res.data["status"] == "pagado"

    booking.refresh_from_db()
    assert booking.status == Booking.Status.CONFIRMADA


@pytest.mark.django_db
def test_external_payment_requires_operation_and_amount(
    api_client, huesped, hospedaje_aprobado
):
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
    payment_id = booking_res.data["payment"]["id"]

    missing = api_client.post(f"/api/v1/pagos/{payment_id}/externo/", {}, format="json")
    assert missing.status_code == 400

    short_op = api_client.post(
        f"/api/v1/pagos/{payment_id}/externo/",
        {"operation_number": "12", "reported_amount": "50.00"},
        format="json",
    )
    assert short_op.status_code == 400


@pytest.mark.django_db
def test_owner_payments_list(api_client, huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    _, room = hospedaje_aprobado
    owner = room.accommodation.owner
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=40)
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
    payment_id = booking_res.data["payment"]["id"]
    api_client.post(
        f"/api/v1/pagos/{payment_id}/externo/",
        {"operation_number": "YAPE-998877", "reported_amount": "150.00"},
        format="json",
    )

    api_client.force_authenticate(user=owner)
    list_res = api_client.get("/api/v1/propietario/pagos/")
    assert list_res.status_code == 200
    assert len(list_res.data) >= 1
    row = next(p for p in list_res.data if p["id"] == payment_id)
    assert row["external_operation_number"] == "YAPE-998877"
    assert row["guest_reported_amount"] == "150.00"
    assert row["hospedaje"] == room.accommodation.name


@pytest.mark.django_db
def test_owner_registra_pago_directo_sin_paso_huesped(
    api_client, huesped, hospedaje_aprobado, propietario
):
    from datetime import date, timedelta

    _, room = hospedaje_aprobado
    owner = room.accommodation.owner
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=35)
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
    payment_id = booking_res.data["payment"]["id"]

    api_client.force_authenticate(user=owner)
    confirm_res = api_client.post(
        f"/api/v1/pagos/{payment_id}/confirmar-externo/",
        {},
        format="json",
    )
    assert confirm_res.status_code == 200
    assert confirm_res.data["status"] == "pagado"
    assert confirm_res.data["method"] == "externo"

    booking = Booking.objects.get(pk=booking_res.data["id"])
    assert booking.status == Booking.Status.CONFIRMADA


@pytest.mark.django_db
def test_mercadopago_webhook_confirms_pagoefectivo(mocker, huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    from bookings.models import Booking

    mocker.patch("payments.services.get_gateway_name", return_value="mercadopago")

    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() + timedelta(days=10),
        check_out=date.today() + timedelta(days=12),
        total_amount="120.00",
        status=Booking.Status.PENDIENTE,
    )
    payment = Payment.objects.create(
        booking=booking,
        guest=huesped,
        amount="120.00",
        currency="PEN",
        status=Payment.Status.PENDIENTE,
        method=Payment.Method.PAGOEFECTIVO,
        gateway="mercadopago",
        gateway_charge_id="999888",
    )
    mocker.patch(
        "payments.gateways.mercadopago.fetch_payment",
        return_value={
            "id": "999888",
            "status": "approved",
            "external_reference": f"hospy-pago-{payment.pk}",
        },
    )

    response = api_client.post(
        "/api/v1/pagos/webhook/mercadopago/",
        {"type": "payment", "data": {"id": "999888"}},
        format="json",
    )
    assert response.status_code == 200

    payment.refresh_from_db()
    booking.refresh_from_db()
    assert payment.status == Payment.Status.PAGADO
    assert booking.status == Booking.Status.CONFIRMADA
