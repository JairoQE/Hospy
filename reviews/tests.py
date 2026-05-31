import pytest

from bookings.models import Booking
from reviews.models import Review


@pytest.mark.django_db
def test_crear_resena_requiere_estadia(api_client, huesped, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        "/api/v1/resenas/",
        {"accommodation": acc.id, "rating": 5, "comment": "Genial"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_flujo_resena(api_client, huesped, admin_user, hospedaje_aprobado, settings):
    settings.REVIEWS_AUTO_APPROVE = False
    from datetime import date, timedelta

    acc, room = hospedaje_aprobado
    Booking.objects.create(
        guest=huesped,
        room=room,
        check_in=date.today() - timedelta(days=10),
        check_out=date.today() - timedelta(days=8),
        total_amount=200,
        status=Booking.Status.COMPLETADA,
    )
    api_client.force_authenticate(user=huesped)
    create = api_client.post(
        "/api/v1/resenas/",
        {"accommodation": acc.id, "rating": 5, "comment": "Excelente"},
        format="json",
    )
    assert create.status_code == 201
    review_id = create.data["id"]

    api_client.force_authenticate(user=admin_user)
    mod = api_client.post(
        f"/api/v1/resenas/{review_id}/moderar/",
        {"aprobada": True},
        format="json",
    )
    assert mod.status_code == 200
    acc.refresh_from_db()
    assert float(acc.average_rating) == 5.0
