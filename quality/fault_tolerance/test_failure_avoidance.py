"""
RFt-1-G — Evitación de fallos (Failure avoidance).

Cada test simula un patrón de fallo o entrada inválida. El sistema debe responder
con un error controlado (4xx/503 JSON), no con 500 ni caída sin respuesta.

Medición: X = A / B
  A = tests que pasan (fallo evitado / manejado correctamente)
  B = total de tests en este módulo

Ejecutar:
  pytest quality/fault_tolerance/ -v
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from bookings.models import Booking
from payments.models import Payment


def _assert_controlled_error(response, *, allowed=(400, 401, 403, 404, 405, 503)):
    assert response.status_code in allowed, (
        f"Se esperaba error controlado {allowed}, obtuvo {response.status_code}: "
        f"{getattr(response, 'data', response.content)!r}"
    )
    if response.status_code != 204:
        assert response["Content-Type"].startswith("application/json")


@pytest.mark.django_db
def test_health_responde_json_aunque_degraded(api_client, settings, monkeypatch):
    """Fallo en caché: /health/ debe degradar sin 500."""
    from config import health as health_module

    monkeypatch.setattr(
        health_module,
        "check_cache",
        lambda: {"status": "error", "detail": "cache down"},
    )
    response = api_client.get("/health/")
    assert response.status_code == 503
    assert response.data["status"] == "degraded"
    assert "checks" in response.data


@pytest.mark.django_db
def test_login_sin_credenciales(api_client):
    response = api_client.post("/api/v1/auth/login/", {}, format="json")
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_login_password_incorrecta(api_client, huesped):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": huesped.email, "password": "MalPassword123!"},
        format="json",
    )
    _assert_controlled_error(response, allowed=(401,))


@pytest.mark.django_db
def test_perfil_sin_autenticacion(api_client):
    response = api_client.get("/api/v1/auth/perfil/")
    _assert_controlled_error(response, allowed=(401, 403))


@pytest.mark.django_db
def test_integracion_sin_api_key(api_client):
    response = api_client.get("/api/v1/integracion/hospedajes/")
    _assert_controlled_error(response, allowed=(401, 403))


@pytest.mark.django_db
def test_integracion_api_key_invalida(api_client):
    response = api_client.get(
        "/api/v1/integracion/hospedajes/",
        HTTP_X_HOSPY_INTEGRATION_KEY="clave-incorrecta",
    )
    _assert_controlled_error(response, allowed=(401, 403))


@pytest.mark.django_db
def test_integracion_api_key_valida(api_client):
    response = api_client.get(
        "/api/v1/integracion/hospedajes/",
        HTTP_X_HOSPY_INTEGRATION_KEY="test-integration-key",
    )
    assert response.status_code == 200
    assert isinstance(response.data, (list, dict))


@pytest.mark.django_db
def test_reserva_sin_autenticacion(api_client, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    check_in = date.today() + timedelta(days=20)
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
    _assert_controlled_error(response, allowed=(401, 403))


@pytest.mark.django_db
def test_reserva_fechas_invalidas(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=25)
    check_out = check_in - timedelta(days=1)
    response = api_client.post(
        "/api/v1/reservas/",
        {
            "room": room.id,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        },
        format="json",
    )
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_reserva_habitacion_inexistente(api_client, huesped):
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=25)
    check_out = check_in + timedelta(days=2)
    response = api_client.post(
        "/api/v1/reservas/",
        {
            "room": 999999,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        },
        format="json",
    )
    _assert_controlled_error(response, allowed=(400, 404))


@pytest.mark.django_db
def test_cancelar_reserva_ajena(api_client, huesped, hospedaje_aprobado):
    from django.contrib.auth import get_user_model

    _, room = hospedaje_aprobado
    User = get_user_model()
    otro = User.objects.create_user(
        email="otro_huesped@hospy.local",
        username="otro_huesped",
        password="Testpass123!",
        role=User.Role.HUESPED,
    )
    booking = Booking.objects.create(
        guest=otro,
        room=room,
        check_in=date.today() + timedelta(days=30),
        check_out=date.today() + timedelta(days=32),
        total_amount="200.00",
        status=Booking.Status.PENDIENTE,
    )
    api_client.force_authenticate(user=huesped)
    response = api_client.post(f"/api/v1/reservas/{booking.pk}/cancelar/")
    _assert_controlled_error(response, allowed=(400, 403, 404))


@pytest.mark.django_db
def test_endpoint_inexistente(api_client):
    response = api_client.get("/api/v1/ruta-que-no-existe/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_health_db_degradada(api_client, monkeypatch):
    """Fallo en base de datos: /health/ debe degradar sin 500."""
    from config import health as health_module

    monkeypatch.setattr(
        health_module,
        "check_database",
        lambda: {"status": "error", "detail": "db down"},
    )
    response = api_client.get("/health/")
    assert response.status_code == 503
    assert response.data["status"] == "degraded"
    assert response.data["checks"]["database"]["status"] == "error"


@pytest.mark.django_db
def test_login_json_invalido(api_client):
    response = api_client.post(
        "/api/v1/auth/login/",
        data='{"email": "x@hospy.local",',
        content_type="application/json",
    )
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_reserva_room_tipo_incorrecto(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    check_in = date.today() + timedelta(days=25)
    check_out = check_in + timedelta(days=2)
    response = api_client.post(
        "/api/v1/reservas/",
        {
            "room": "no-es-un-id",
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        },
        format="json",
    )
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_integracion_cercanos_sin_coordenadas(api_client):
    response = api_client.get(
        "/api/v1/integracion/hospedajes/cercanos/",
        HTTP_X_HOSPY_INTEGRATION_KEY="test-integration-key",
    )
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_pago_externo_operacion_corta(api_client, huesped, reserva_pendiente_con_pago):
    _, payment = reserva_pendiente_con_pago
    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        f"/api/v1/pagos/{payment.pk}/externo/",
        {"operation_number": "12", "reported_amount": "50.00"},
        format="json",
    )
    _assert_controlled_error(response, allowed=(400,))


@pytest.mark.django_db
def test_pago_externo_reserva_ajena(api_client, hospedaje_aprobado, reserva_pendiente_con_pago):
    from django.contrib.auth import get_user_model

    _, payment = reserva_pendiente_con_pago
    User = get_user_model()
    intruso = User.objects.create_user(
        email="intruso@hospy.local",
        username="intruso",
        password="Testpass123!",
        role=User.Role.HUESPED,
    )
    api_client.force_authenticate(user=intruso)
    response = api_client.post(
        f"/api/v1/pagos/{payment.pk}/externo/",
        {"operation_number": "12345678", "reported_amount": "50.00"},
        format="json",
    )
    _assert_controlled_error(response, allowed=(403, 404))


@pytest.mark.django_db
def test_propietario_confirma_pago_ajeno(api_client, propietario, reserva_pendiente_con_pago):
    from django.contrib.auth import get_user_model

    _, payment = reserva_pendiente_con_pago
    User = get_user_model()
    otro_prop = User.objects.create_user(
        email="otro_prop@hospy.local",
        username="otro_prop",
        password="Testpass123!",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
    )
    payment.method = Payment.Method.EXTERNO
    payment.status = Payment.Status.PROCESANDO
    payment.save(update_fields=["method", "status", "updated_at"])
    api_client.force_authenticate(user=otro_prop)
    response = api_client.post(f"/api/v1/pagos/{payment.pk}/confirmar-externo/")
    _assert_controlled_error(response, allowed=(400, 403))


@pytest.mark.django_db
def test_propietario_confirma_reserva_ajena(api_client, huesped, hospedaje_aprobado):
    from django.contrib.auth import get_user_model

    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() + timedelta(days=35),
        check_out=date.today() + timedelta(days=37),
        total_amount="200.00",
        status=Booking.Status.PENDIENTE,
    )
    User = get_user_model()
    otro_prop = User.objects.create_user(
        email="otro_prop2@hospy.local",
        username="otro_prop2",
        password="Testpass123!",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
    )
    api_client.force_authenticate(user=otro_prop)
    response = api_client.post(f"/api/v1/reservas/{booking.pk}/confirmar/")
    _assert_controlled_error(response, allowed=(403, 404))


@pytest.mark.django_db
def test_reembolso_registrar_sin_ser_propietario(
    api_client, reserva_cancelada_con_reembolso
):
    booking = reserva_cancelada_con_reembolso
    from django.contrib.auth import get_user_model

    User = get_user_model()
    otro_prop = User.objects.create_user(
        email="otro_prop3@hospy.local",
        username="otro_prop3",
        password="Testpass123!",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
    )
    api_client.force_authenticate(user=otro_prop)
    response = api_client.post(
        f"/api/v1/reservas/{booking.pk}/reembolso/registrar/",
        {"operation_number": "12345678", "reported_amount": "100.00"},
        format="json",
    )
    _assert_controlled_error(response, allowed=(400, 403, 404))


@pytest.mark.django_db
def test_reembolso_disputar_antes_de_plazo(api_client, huesped, reserva_cancelada_con_reembolso):
    booking = reserva_cancelada_con_reembolso
    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        f"/api/v1/reservas/{booking.pk}/reembolso/disputar/",
        {"notes": "Aún dentro del plazo"},
        format="json",
    )
    _assert_controlled_error(response, allowed=(400,))
