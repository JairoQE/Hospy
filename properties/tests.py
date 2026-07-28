import pytest

from properties.models import Accommodation
from properties.services import haversine_km
from rooms.models import Room


def test_haversine_cusco_lima():
    dist = haversine_km(-12.0464, -77.0428, -13.5164, -71.9785)
    assert 500 < dist < 650


@pytest.mark.django_db
def test_listado_hospedajes_publico(api_client, hospedaje_aprobado):
    response = api_client.get("/api/v1/hospedajes/")
    assert response.status_code == 200
    assert response.data["count"] >= 1


@pytest.mark.django_db
def test_propietario_crea_hospedaje_redondea_coordenadas(api_client, propietario):
    api_client.force_authenticate(user=propietario)
    response = api_client.post(
        "/api/v1/hospedajes/",
        {
            "name": "Casa Rupa",
            "type": "hospedaje",
            "description": "Desc",
            "address": "Jr. Cajamarca",
            "city": "Rupa-Rupa",
            "region": "Huánuco",
            "country": "Perú",
            "latitude": "-9.301907652284314",
            "longitude": "-76.00149750709535",
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    acc = Accommodation.objects.get(pk=response.data["id"])
    assert str(acc.latitude) == "-9.301908"
    assert str(acc.longitude) == "-76.001498"


@pytest.mark.django_db
def test_propietario_crea_servicio(api_client, propietario):
    api_client.force_authenticate(user=propietario)
    response = api_client.post(
        "/api/v1/servicios/",
        {"name": "Spa"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["name"] == "Spa"
    assert response.data["slug"] == "spa"


@pytest.mark.django_db
def test_propietario_edita_y_elimina_servicio(api_client, propietario):
    from properties.models import Service

    svc = Service.objects.create(name="Gimnasio", slug="gimnasio", icon="gimnasio")
    api_client.force_authenticate(user=propietario)

    patch = api_client.patch(
        "/api/v1/servicios/gimnasio/",
        {"name": "Gimnasio 24h"},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["name"] == "Gimnasio 24h"

    delete = api_client.delete("/api/v1/servicios/gimnasio-24h/")
    assert delete.status_code == 204
    svc.refresh_from_db()
    assert svc.is_active is False


@pytest.mark.django_db
def test_detalle_incluye_otros_mismo_propietario(api_client, propietario, hospedaje_aprobado):
    acc1, _ = hospedaje_aprobado
    acc2 = Accommodation.objects.create(
        owner=propietario,
        name="Hotel Hermano",
        type=Accommodation.Type.HOTEL,
        description="Otro",
        status=Accommodation.Status.APROBADO,
        is_active=True,
        address="Calle 2",
        city="Lima",
        region="Lima",
        latitude="-12.050000",
        longitude="-77.040000",
    )
    Room.objects.create(
        accommodation=acc2,
        number="20",
        type=Room.Type.DOBLE,
        capacity=2,
        base_price=150,
    )

    r1 = api_client.get(f"/api/v1/hospedajes/{acc1.id}/")
    assert r1.status_code == 200
    assert r1.data["propietario_nombre"] == "Prop"
    otros = r1.data["otros_mismo_propietario"]
    assert len(otros) == 1
    assert otros[0]["id"] == acc2.id
    assert otros[0]["distance_km"] is not None

    r2 = api_client.get(f"/api/v1/hospedajes/{acc2.id}/")
    assert r2.status_code == 200
    assert len(r2.data["otros_mismo_propietario"]) == 1
    assert r2.data["otros_mismo_propietario"][0]["id"] == acc1.id


@pytest.mark.django_db
def test_filtro_zona_costa(api_client, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    r = api_client.get("/api/v1/hospedajes/", {"zona": "costa"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.data["results"]]
    assert acc.id in ids


@pytest.mark.django_db
def test_owner_panel_bootstrap(api_client, propietario, hospedaje_aprobado):
    acc, _room = hospedaje_aprobado
    api_client.force_authenticate(user=propietario)
    response = api_client.get("/api/v1/propietario/panel-bootstrap/")
    assert response.status_code == 200
    assert any(h["id"] == acc.id for h in response.data["hospedajes"])
    assert "reservas" in response.data
    assert "resenas" in response.data
    assert "servicios" in response.data


@pytest.mark.django_db
def test_owner_panel_bootstrap_refresca_tras_confirmar(
    api_client, propietario, huesped, hospedaje_aprobado
):
    from datetime import date, timedelta

    from bookings.models import Booking

    _, room = hospedaje_aprobado
    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() + timedelta(days=40),
        check_out=date.today() + timedelta(days=42),
        total_amount=200,
        status=Booking.Status.PENDIENTE,
    )
    api_client.force_authenticate(user=propietario)

    first = api_client.get("/api/v1/propietario/panel-bootstrap/")
    row = next(r for r in first.data["reservas"] if r["id"] == booking.id)
    assert row["status"] == "pendiente"

    assert api_client.post(f"/api/v1/reservas/{booking.id}/confirmar/").status_code == 200

    second = api_client.get("/api/v1/propietario/panel-bootstrap/")
    row = next(r for r in second.data["reservas"] if r["id"] == booking.id)
    assert row["status"] == "confirmada"


@pytest.mark.django_db
def test_admin_lista_todos_hospedajes(api_client, admin_user, hospedaje_aprobado):
    """Admin ve todos los locales, no solo pendientes."""
    from properties.models import Accommodation

    acc, _ = hospedaje_aprobado
    owner = acc.owner
    Accommodation.objects.create(
        owner=owner,
        name="Hostal Pendiente",
        type=Accommodation.Type.HOSTAL,
        description="Desc",
        address="Calle 2",
        city="Cusco",
        region="Cusco",
        latitude=acc.latitude,
        longitude=acc.longitude,
        status=Accommodation.Status.PENDIENTE,
        is_active=False,
    )
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/v1/hospedajes/admin/")
    assert response.status_code == 200
    results = response.data["results"] if "results" in response.data else response.data
    assert len(results) >= 2
    statuses = {row["status"] for row in results}
    assert "aprobado" in statuses
    assert "pendiente" in statuses

    only_hostal = api_client.get("/api/v1/hospedajes/admin/?type=hostal")
    assert only_hostal.status_code == 200
    hostal_rows = (
        only_hostal.data["results"]
        if "results" in only_hostal.data
        else only_hostal.data
    )
    assert all(row["type"] == "hostal" for row in hostal_rows)

    soft = api_client.post(
        f"/api/v1/hospedajes/{acc.id}/eliminar-admin/",
        {"motivo": "Incumplimiento de políticas de la plataforma"},
        format="json",
    )
    assert soft.status_code == 200
    assert soft.data["is_deleted"] is True
    assert soft.data["status"] == "inactivo"
    assert soft.data["is_active"] is False

    from audit.models import AuditLog
    from audit.actions import action_label
    from notifications.models import InboxItem

    delete_log = AuditLog.objects.filter(
        action="accommodation.soft_delete_admin",
        target_id=acc.id,
    ).latest("id")
    assert delete_log.actor_id == admin_user.id
    assert delete_log.metadata.get("to") == "inactivo"
    assert delete_log.metadata.get("from") == "aprobado"
    assert "políticas" in delete_log.metadata.get("motivo", "").lower()
    assert "soft delete" in action_label(delete_log.action).lower()

    owner_notice = InboxItem.objects.filter(
        recipient=owner,
        kind="accommodation_soft_deleted",
    ).first()
    assert owner_notice is not None
    assert "políticas" in owner_notice.body.lower()

    listed = api_client.get("/api/v1/hospedajes/admin/?include_deleted=1")
    listed_rows = listed.data["results"] if "results" in listed.data else listed.data
    soft_row = next(r for r in listed_rows if r["id"] == acc.id)
    assert soft_row["is_deleted"] is True
    assert soft_row["status"] == "inactivo"

    restore = api_client.post(f"/api/v1/hospedajes/{acc.id}/restaurar/", {}, format="json")
    assert restore.status_code == 200
    acc.refresh_from_db()
    assert acc.is_deleted is False
    assert acc.status == "aprobado"
    assert acc.is_active is True

    missing_motivo = api_client.post(
        f"/api/v1/hospedajes/{acc.id}/eliminar-admin/",
        {},
        format="json",
    )
    assert missing_motivo.status_code == 400

    restore_log = AuditLog.objects.filter(
        action="accommodation.restore",
        target_id=acc.id,
    ).latest("id")
    assert restore_log.actor_id == admin_user.id
    assert restore_log.metadata.get("from") == "inactivo"
    assert restore_log.metadata.get("to") == "aprobado"


@pytest.mark.django_db
def test_admin_lista_hospedajes_solo_admin(api_client, huesped, hospedaje_aprobado):
    api_client.force_authenticate(user=huesped)
    response = api_client.get("/api/v1/hospedajes/admin/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_dashboard_bootstrap(api_client, admin_user, hospedaje_aprobado):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/v1/admin/dashboard-bootstrap/")
    assert response.status_code == 200
    assert "reservas" in response.data
    assert "hospedajes_aprobados_total" in response.data
    assert response.data["hospedajes_aprobados_total"] >= 1


@pytest.mark.django_db
def test_detalle_bootstrap_publico_sin_login(api_client, hospedaje_aprobado):
    """Huésped anónimo debe poder abrir la ficha (regresión: antes devolvía 404)."""
    acc, _room = hospedaje_aprobado
    response = api_client.get(f"/api/v1/hospedajes/{acc.id}/detalle-bootstrap/")
    assert response.status_code == 200
    assert response.data["hospedaje"]["id"] == acc.id


@pytest.mark.django_db
def test_detalle_bootstrap_agrupa_datos(api_client, hospedaje_aprobado):
    acc, room = hospedaje_aprobado
    response = api_client.get(f"/api/v1/hospedajes/{acc.id}/detalle-bootstrap/")
    assert response.status_code == 200
    assert response.data["hospedaje"]["id"] == acc.id
    assert len(response.data["habitaciones"]) >= 1
    assert response.data["habitaciones"][0]["id"] == room.id
    assert "resenas" in response.data


@pytest.mark.django_db
def test_detalle_bootstrap_incluye_ofertas_vigentes(api_client, hospedaje_aprobado):
    from decimal import Decimal

    from django.utils import timezone

    from properties.models import AccommodationOffer

    acc, room = hospedaje_aprobado
    offer = AccommodationOffer.objects.create(
        accommodation=acc,
        discount_percent=Decimal("20"),
        start_date=timezone.localdate(),
        duration_days=7,
        is_active=True,
        title="Promo verano",
    )
    offer.rooms.set([room.id])

    response = api_client.get(f"/api/v1/hospedajes/{acc.id}/detalle-bootstrap/")
    assert response.status_code == 200
    assert len(response.data["ofertas_vigentes"]) == 1
    assert response.data["ofertas_vigentes"][0]["discount_percent"] == "20.00"
    assert response.data["precios_display"]["oferta_activa"] is True


@pytest.mark.django_db
def test_cotizacion_habitaciones(api_client, hospedaje_aprobado):
    acc, _room = hospedaje_aprobado
    response = api_client.get(
        f"/api/v1/hospedajes/{acc.id}/cotizacion/",
        {"entrada": "2026-06-01", "salida": "2026-06-03"},
    )
    assert response.status_code == 200
    assert len(response.data["cotizaciones"]) >= 1
    quote = response.data["cotizaciones"][0]
    assert quote["room_id"] is not None
    assert quote["noches"] == 2


@pytest.mark.django_db
def test_hospedajes_cercanos(api_client, hospedaje_aprobado):
    response = api_client.get(
        "/api/v1/hospedajes/cercanos/",
        {"lat": "-12.0464", "lng": "-77.0428", "radio_km": "5"},
    )
    assert response.status_code == 200
    assert len(response.data) >= 1
