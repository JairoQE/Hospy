import pytest
from datetime import date
from decimal import Decimal

from properties.models import Accommodation, Service
from rooms.models import Room, SeasonRate


@pytest.mark.django_db
def test_propietario_crud_habitaciones(api_client, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    api_client.force_authenticate(user=propietario)

    create = api_client.post(
        f"/api/v1/hospedajes/{acc.id}/habitaciones/",
        {
            "number": "201",
            "type": Room.Type.SUITE,
            "capacity": 3,
            "floor": 2,
            "description": "Vista jardín",
            "base_price": "250.00",
        },
        format="json",
    )
    assert create.status_code == 201
    room_id = create.data["id"]

    listed = api_client.get(f"/api/v1/habitaciones/?accommodation={acc.id}")
    assert listed.status_code == 200
    results = listed.data.get("results", listed.data)
    assert any(r["id"] == room_id for r in results)

    patch = api_client.patch(
        f"/api/v1/habitaciones/{room_id}/",
        {"base_price": "275.00"},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["base_price"] == "275.00"

    pause = api_client.post(f"/api/v1/habitaciones/{room_id}/desactivar/")
    assert pause.status_code == 200
    assert pause.data["is_active"] is False

    fotos = api_client.get(f"/api/v1/habitaciones/{room_id}/fotos/")
    assert fotos.status_code == 200
    assert fotos.data == []

    from io import BytesIO

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (80, 60), color=(100, 150, 200)).save(buf, format="JPEG")
    img = SimpleUploadedFile("hab.jpg", buf.getvalue(), content_type="image/jpeg")
    upload = api_client.post(
        f"/api/v1/habitaciones/{room_id}/fotos/",
        {"image": img},
        format="multipart",
    )
    assert upload.status_code == 201
    assert upload.data.get("image_url") or upload.data.get("image")

    delete = api_client.delete(f"/api/v1/habitaciones/{room_id}/")
    assert delete.status_code == 204
    room = Room.objects.get(pk=room_id)
    assert room.is_active is False


@pytest.mark.django_db
def test_no_crear_habitacion_si_hospedaje_pendiente(api_client, propietario):
    acc = Accommodation.objects.create(
        owner=propietario,
        name="Pendiente",
        type=Accommodation.Type.HOSTAL,
        description="Desc",
        status=Accommodation.Status.PENDIENTE,
        address="Calle 1",
        city="Lima",
        region="Lima",
        latitude="-12.046400",
        longitude="-77.042800",
    )
    api_client.force_authenticate(user=propietario)
    r = api_client.post(
        f"/api/v1/hospedajes/{acc.id}/habitaciones/",
        {
            "number": "1",
            "type": Room.Type.SIMPLE,
            "capacity": 1,
            "base_price": "80",
        },
        format="json",
    )
    assert r.status_code == 400


@pytest.mark.django_db
def test_publico_lista_habitaciones_incluye_fotos(api_client, hospedaje_aprobado):
    acc, room = hospedaje_aprobado
    response = api_client.get(f"/api/v1/hospedajes/{acc.id}/habitaciones/")
    assert response.status_code == 200
    results = response.data.get("results", response.data)
    row = next((x for x in results if x["id"] == room.id), None)
    assert row is not None
    assert "fotos" in row
    assert row["fotos"] == []


@pytest.mark.django_db
def test_habitacion_servicios_por_habitacion(api_client, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    jacuzzi, _ = Service.objects.get_or_create(
        slug="jacuzzi-test",
        defaults={"name": "Jacuzzi", "icon": "jacuzzi"},
    )
    wifi, _ = Service.objects.get_or_create(
        slug="wifi-test-room",
        defaults={"name": "WiFi", "icon": "wifi"},
    )
    api_client.force_authenticate(user=propietario)

    create = api_client.post(
        f"/api/v1/hospedajes/{acc.id}/habitaciones/",
        {
            "number": "Suite 1",
            "type": Room.Type.SUITE,
            "capacity": 2,
            "floor": 1,
            "description": "Con jacuzzi",
            "base_price": "320.00",
            "service_ids": [jacuzzi.id, wifi.id],
        },
        format="json",
    )
    assert create.status_code == 201
    room_id = create.data["id"]
    assert {s["slug"] for s in create.data["services"]} == {"jacuzzi-test", "wifi-test-room"}

    public = api_client.get(f"/api/v1/hospedajes/{acc.id}/habitaciones/")
    assert public.status_code == 200
    results = public.data.get("results", public.data)
    row = next(r for r in results if r["id"] == room_id)
    assert {s["slug"] for s in row["services"]} == {"jacuzzi-test", "wifi-test-room"}

    patch = api_client.patch(
        f"/api/v1/habitaciones/{room_id}/",
        {"service_ids": [wifi.id]},
        format="json",
    )
    assert patch.status_code == 200
    assert [s["slug"] for s in patch.data["services"]] == ["wifi-test-room"]


@pytest.mark.django_db
def test_cambiar_precio_base_sincroniza_tarifa_temporada(
    api_client, propietario, hospedaje_aprobado
):
    acc, room = hospedaje_aprobado
    SeasonRate.objects.create(
        room=room,
        season=SeasonRate.Season.ALTA,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 8, 31),
        price_per_night=Decimal("150.00"),
    )

    api_client.force_authenticate(user=propietario)
    patch = api_client.patch(
        f"/api/v1/habitaciones/{room.id}/",
        {"base_price": "1.00"},
        format="json",
    )
    assert patch.status_code == 200

    rate = SeasonRate.objects.get(room=room)
    assert rate.price_per_night == Decimal("1.00")

    quote = api_client.get(
        f"/api/v1/hospedajes/{acc.id}/cotizacion/",
        {"entrada": "2026-06-10", "salida": "2026-06-12"},
    )
    assert quote.status_code == 200
    row = next(q for q in quote.data["cotizaciones"] if q["room_id"] == room.id)
    assert row["total"] == "2.00"


@pytest.mark.django_db
def test_calendario_hospedaje_por_habitacion(api_client, hospedaje_aprobado):
    from bookings.models import Booking
    from django.contrib.auth import get_user_model

    acc, room = hospedaje_aprobado
    other = Room.objects.create(
        accommodation=acc,
        number="202",
        type=Room.Type.DOBLE,
        capacity=2,
        base_price=Decimal("120.00"),
    )
    guest = get_user_model().objects.create_user(
        username="guest-cal",
        email="guest-cal@test.com",
        password="pass",
    )
    Booking.objects.create(
        room=room,
        guest=guest,
        check_in=date(2026, 6, 20),
        check_out=date(2026, 6, 22),
        total_amount=Decimal("200.00"),
        status=Booking.Status.CONFIRMADA,
    )

    r = api_client.get(
        f"/api/v1/hospedajes/{acc.id}/disponibilidad/",
        {"anio": 2026, "mes": 6},
    )
    assert r.status_code == 200
    assert r.data["pricing_model"] == "per_room"
    by_date = {d["date"]: d for d in r.data["days"]}
    assert by_date["2026-06-20"]["status"] == "parcial"
    assert by_date["2026-06-20"]["available"] is True
    assert by_date["2026-06-20"]["rooms_available"] == 1

    other.is_active = False
    other.save(update_fields=["is_active"])
    Booking.objects.create(
        room=room,
        guest=guest,
        check_in=date(2026, 6, 25),
        check_out=date(2026, 6, 27),
        total_amount=Decimal("240.00"),
        status=Booking.Status.CONFIRMADA,
    )
    r2 = api_client.get(
        f"/api/v1/hospedajes/{acc.id}/disponibilidad/",
        {"anio": 2026, "mes": 6},
    )
    by_date2 = {d["date"]: d for d in r2.data["days"]}
    assert by_date2["2026-06-25"]["status"] == "ocupado"
    assert by_date2["2026-06-25"]["available"] is False


@pytest.mark.django_db
def test_calendario_hospedaje_por_unidad(api_client, propietario):
    acc = Accommodation.objects.create(
        owner=propietario,
        name="Casa playa",
        type=Accommodation.Type.CASA_DEPARTAMENTO,
        description="Desc",
        status=Accommodation.Status.APROBADO,
        is_active=True,
        address="Calle 1",
        city="Lima",
        region="Lima",
        latitude="-12.046400",
        longitude="-77.042800",
    )
    room = Room.objects.create(
        accommodation=acc,
        number="1",
        type=Room.Type.FAMILIAR,
        capacity=4,
        base_price=Decimal("300.00"),
    )
    from bookings.models import Booking
    from django.contrib.auth import get_user_model

    guest = get_user_model().objects.create_user(
        username="guest-unit",
        email="guest-unit@test.com",
        password="pass",
    )
    Booking.objects.create(
        room=room,
        guest=guest,
        check_in=date(2026, 7, 10),
        check_out=date(2026, 7, 12),
        total_amount=Decimal("600.00"),
        status=Booking.Status.CONFIRMADA,
    )

    r = api_client.get(
        f"/api/v1/hospedajes/{acc.id}/disponibilidad/",
        {"anio": 2026, "mes": 7},
    )
    assert r.status_code == 200
    assert r.data["pricing_model"] == "per_unit"
    by_date = {d["date"]: d for d in r.data["days"]}
    assert by_date["2026-07-10"]["status"] == "ocupado"
    assert by_date["2026-07-11"]["status"] == "ocupado"
