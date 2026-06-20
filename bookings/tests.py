from datetime import date, timedelta

import pytest

from bookings.models import Booking


@pytest.mark.django_db
def test_crear_reserva(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    response = api_client.post(
        "/api/v1/reservas/",
        {
            "room": room.id,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["status"] == "pendiente"
    assert float(response.data["total_amount"]) == 200.0


@pytest.mark.django_db
def test_reserva_bloquea_fechas(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=40)
    check_out = check_in + timedelta(days=2)
    payload = {
        "room": room.id,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
    }
    assert (
        api_client.post("/api/v1/reservas/", payload, format="json").status_code == 201
    )
    dup = api_client.post("/api/v1/reservas/", payload, format="json")
    assert dup.status_code == 400


@pytest.mark.django_db
def test_complete_past_bookings_task(huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    from bookings.tasks import complete_past_bookings

    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() - timedelta(days=5),
        check_out=date.today() - timedelta(days=2),
        total_amount=200,
        status=Booking.Status.CONFIRMADA,
    )
    updated = complete_past_bookings()
    assert updated >= 1
    booking.refresh_from_db()
    assert booking.status == Booking.Status.COMPLETADA


@pytest.mark.django_db
def test_send_check_in_reminders_task(api_client, propietario, huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    from bookings.tasks import send_check_in_reminders
    from notifications.models import InboxItem

    acc, room = hospedaje_aprobado
    tomorrow = date.today() + timedelta(days=1)
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=tomorrow,
        check_out=tomorrow + timedelta(days=2),
        total_amount=200,
        status=Booking.Status.CONFIRMADA,
    )

    sent = send_check_in_reminders()
    assert sent == 1
    booking.refresh_from_db()
    assert booking.check_in_reminder_sent_at is not None
    assert InboxItem.objects.filter(
        recipient=acc.owner,
        kind="check_in_reminder",
        title="Check-in mañana",
    ).exists()

    assert send_check_in_reminders() == 0


@pytest.mark.django_db
def test_propietario_calendario_ocupacion(api_client, propietario, huesped, hospedaje_aprobado):
    from datetime import date, timedelta

    acc, room = hospedaje_aprobado
    api_client.force_authenticate(user=propietario)
    check_in = date(2026, 8, 12)
    Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=check_in,
        check_out=check_in + timedelta(days=2),
        total_amount=200,
        status=Booking.Status.CONFIRMADA,
    )

    r = api_client.get(
        "/api/v1/propietario/calendario/",
        {"anio": 2026, "mes": 8, "hospedaje_id": acc.id},
    )
    assert r.status_code == 200
    by_date = {d["date"]: d for d in r.data["days"]}
    assert by_date["2026-08-12"]["status"] == "ocupado"
    assert by_date["2026-08-12"]["check_ins_count"] == 1
    assert len(by_date["2026-08-12"]["bookings"]) >= 1


@pytest.mark.django_db
def test_confirmar_reserva_aun_si_falla_notificacion(
    api_client, propietario, huesped, hospedaje_aprobado, monkeypatch
):
    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() + timedelta(days=50),
        check_out=date.today() + timedelta(days=52),
        total_amount=200,
        status=Booking.Status.PENDIENTE,
    )

    def _boom(_booking):
        raise RuntimeError("correo caído")

    monkeypatch.setattr("bookings.services.notify_booking_confirmed", _boom)
    api_client.force_authenticate(user=propietario)
    response = api_client.post(f"/api/v1/reservas/{booking.id}/confirmar/")
    assert response.status_code == 200
    assert response.data["status"] == "confirmada"
    booking.refresh_from_db()
    assert booking.status == Booking.Status.CONFIRMADA


@pytest.mark.django_db
def test_confirmar_reserva(api_client, propietario, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() + timedelta(days=50),
        check_out=date.today() + timedelta(days=52),
        total_amount=200,
        status=Booking.Status.PENDIENTE,
    )
    api_client.force_authenticate(user=propietario)
    response = api_client.post(f"/api/v1/reservas/{booking.id}/confirmar/")
    assert response.status_code == 200
    assert response.data["status"] == "confirmada"
