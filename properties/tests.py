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
