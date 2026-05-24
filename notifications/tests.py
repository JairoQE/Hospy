import pytest

from notifications.models import InboxItem
from notifications.services import notify_user, unread_counts


@pytest.mark.django_db
def test_bandeja_resumen(api_client, propietario):
    notify_user(
        propietario,
        title="Test",
        body="Hola",
        kind="test",
        as_message=True,
    )
    notify_user(propietario, title="Alerta", body="Sistema", kind="test2")
    api_client.force_authenticate(user=propietario)
    r = api_client.get("/api/v1/bandeja/resumen/")
    assert r.status_code == 200
    assert r.data["mensajes"] == 1
    assert r.data["notificaciones"] == 1


@pytest.mark.django_db
def test_marcar_leido(propietario):
    item = notify_user(propietario, title="X", body="Y")
    assert unread_counts(propietario)["notificaciones"] == 1
    item.is_read = True
    item.save(update_fields=["is_read"])
    assert unread_counts(propietario)["notificaciones"] == 0
