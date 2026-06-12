import pytest
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from properties.models import Accommodation
from properties.price_trend import build_accommodation_price_trend
from rooms.models import Room, RoomBasePriceHistory


@pytest.mark.django_db
def test_tendencia_precios_endpoint(api_client, owner_user):
    acc = Accommodation.objects.create(
        owner=owner_user,
        name="Trend Hotel",
        type=Accommodation.Type.HOTEL,
        description="Test",
        status=Accommodation.Status.APROBADO,
        is_active=True,
        address="Av. Test 1",
        city="Lima",
        region="Lima",
        latitude=Decimal("-12.0464"),
        longitude=Decimal("-77.0428"),
    )
    room = Room.objects.create(
        accommodation=acc,
        number="101",
        type=Room.Type.DOBLE,
        capacity=2,
        base_price=Decimal("200.00"),
    )
    RoomBasePriceHistory.objects.create(
        room=room,
        base_price=Decimal("180.00"),
        effective_from=timezone.localdate() - timedelta(days=10),
    )
    RoomBasePriceHistory.objects.create(
        room=room,
        base_price=Decimal("200.00"),
        effective_from=timezone.localdate(),
    )

    r = api_client.get(f"/api/v1/hospedajes/{acc.id}/tendencia-precios/?dias=30")
    assert r.status_code == 200
    assert len(r.data["points"]) == 30
    assert r.data["currency"] == "PEN"
    assert any(p["price"] is not None for p in r.data["points"])


@pytest.mark.django_db
def test_build_price_trend_reflects_price_change(owner_user):
    acc = Accommodation.objects.create(
        owner=owner_user,
        name="Change Hotel",
        type=Accommodation.Type.HOSTAL,
        description="Test",
        status=Accommodation.Status.APROBADO,
        is_active=True,
        address="Calle 2",
        city="Cusco",
        region="Cusco",
        latitude=Decimal("-13.5319"),
        longitude=Decimal("-71.9675"),
    )
    room = Room.objects.create(
        accommodation=acc,
        number="1",
        type=Room.Type.SIMPLE,
        capacity=1,
        base_price=Decimal("100.00"),
    )
    today = timezone.localdate()
    RoomBasePriceHistory.objects.create(
        room=room,
        base_price=Decimal("80.00"),
        effective_from=today - timedelta(days=5),
    )
    RoomBasePriceHistory.objects.create(
        room=room,
        base_price=Decimal("100.00"),
        effective_from=today,
    )

    trend = build_accommodation_price_trend(acc, days=7, end=today)
    old_point = next(p for p in trend["points"] if p["date"] == (today - timedelta(days=3)).isoformat())
    new_point = next(p for p in trend["points"] if p["date"] == today.isoformat())
    assert old_point["price"] == 80.0
    assert new_point["price"] == 100.0
