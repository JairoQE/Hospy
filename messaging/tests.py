import pytest
from rest_framework import status

from messaging.models import Conversation, Message, MessageReport


@pytest.mark.django_db
def test_huesped_envia_consulta(api_client, huesped, hospedaje_aprobado, propietario):
    acc, _ = hospedaje_aprobado
    propietario.phone = "987654321"
    propietario.save(update_fields=["phone"])

    api_client.force_authenticate(user=huesped)
    r = api_client.post(
        f"/api/v1/hospedajes/{acc.pk}/consulta/",
        {"body": "¿Tienen estacionamiento?"},
        format="json",
    )
    assert r.status_code == status.HTTP_201_CREATED
    assert len(r.data["messages"]) == 1
    assert r.data["messages"][0]["body"] == "¿Tienen estacionamiento?"

    conv = Conversation.objects.get()
    assert conv.guest_id == huesped.id
    assert conv.owner_id == propietario.id
    assert Message.objects.count() == 1


@pytest.mark.django_db
def test_visto_cuando_el_otro_abre_chat(api_client, huesped, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    conv = Conversation.objects.create(
        accommodation=acc,
        guest=huesped,
        owner=propietario,
    )
    msg = Message.objects.create(
        conversation=conv, sender=huesped, body="¿Hay wifi?"
    )

    api_client.force_authenticate(user=propietario)
    r = api_client.get(f"/api/v1/conversaciones/{conv.pk}/mensajes/")
    assert r.status_code == status.HTTP_200_OK

    conv.refresh_from_db()
    assert conv.owner_last_read_at is not None

    api_client.force_authenticate(user=huesped)
    r = api_client.get(f"/api/v1/hospedajes/{acc.pk}/consulta/")
    assert r.status_code == status.HTTP_200_OK
    mine = [m for m in r.data["messages"] if m["is_mine"]]
    assert len(mine) == 1
    assert mine[0]["seen_at"] is not None


@pytest.mark.django_db
def test_propietario_responde(api_client, huesped, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    conv = Conversation.objects.create(
        accommodation=acc,
        guest=huesped,
        owner=propietario,
    )
    Message.objects.create(
        conversation=conv, sender=huesped, body="¿Hay desayuno?"
    )

    api_client.force_authenticate(user=propietario)
    r = api_client.post(
        f"/api/v1/conversaciones/{conv.pk}/mensajes/",
        {"body": "Sí, está incluido."},
        format="json",
    )
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data["body"] == "Sí, está incluido."


@pytest.mark.django_db
def test_detalle_incluye_foto_propietario(api_client, propietario, hospedaje_aprobado):
    from django.core.files.uploadedfile import SimpleUploadedFile

    acc, _ = hospedaje_aprobado
    propietario.photo = SimpleUploadedFile(
        "owner.jpg", b"fake", content_type="image/jpeg"
    )
    propietario.save()

    r = api_client.get(f"/api/v1/hospedajes/{acc.pk}/")
    assert r.status_code == status.HTTP_200_OK
    assert r.data["propietario_foto_url"]


@pytest.mark.django_db
def test_detalle_incluye_telefono_propietario(api_client, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    propietario.phone = "999888777"
    propietario.save(update_fields=["phone"])

    r = api_client.get(f"/api/v1/hospedajes/{acc.pk}/")
    assert r.status_code == status.HTTP_200_OK
    assert r.data["propietario_telefono"] == "999888777"


@pytest.mark.django_db
def test_reportar_mensaje(api_client, huesped, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    conv = Conversation.objects.create(
        accommodation=acc, guest=huesped, owner=propietario
    )
    msg = Message.objects.create(
        conversation=conv, sender=propietario, body="Mensaje ofensivo de prueba"
    )

    api_client.force_authenticate(user=huesped)
    r = api_client.post(
        f"/api/v1/mensajes/{msg.pk}/reportar/",
        {"reason": "ofensivo", "detail": "Insultos"},
        format="json",
    )
    assert r.status_code == status.HTTP_201_CREATED
    assert MessageReport.objects.filter(message=msg, reporter=huesped).exists()


@pytest.mark.django_db
def test_no_reportar_propio_mensaje(api_client, huesped, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    conv = Conversation.objects.create(
        accommodation=acc, guest=huesped, owner=propietario
    )
    msg = Message.objects.create(conversation=conv, sender=huesped, body="Hola")

    api_client.force_authenticate(user=huesped)
    r = api_client.post(
        f"/api/v1/mensajes/{msg.pk}/reportar/",
        {"reason": "spam"},
        format="json",
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_consulta_requiere_huesped(api_client, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    api_client.force_authenticate(user=propietario)
    r = api_client.post(
        f"/api/v1/hospedajes/{acc.pk}/consulta/",
        {"body": "Hola"},
        format="json",
    )
    assert r.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_puede_consultar_anfitrion(api_client, admin_user, hospedaje_aprobado, propietario):
    acc, _ = hospedaje_aprobado
    api_client.force_authenticate(user=admin_user)
    r = api_client.get(f"/api/v1/hospedajes/{acc.pk}/consulta/")
    assert r.status_code == status.HTTP_200_OK
    r = api_client.post(
        f"/api/v1/hospedajes/{acc.pk}/consulta/",
        {"body": "Mensaje del equipo Hospy"},
        format="json",
    )
    assert r.status_code == status.HTTP_201_CREATED
    conv = Conversation.objects.get(guest=admin_user, accommodation=acc)
    assert conv.owner_id == propietario.id
