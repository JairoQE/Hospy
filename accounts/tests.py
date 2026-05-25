import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_registro_huesped(api_client):
    response = api_client.post(
        "/api/v1/auth/registro/",
        {
            "email": "nuevo@hospy.local",
            "first_name": "Nuevo",
            "last_name": "Usuario",
            "password": "Nuevopass123!",
        },
        format="json",
    )
    assert response.status_code == 201
    assert "access" in response.data
    assert response.data["user"]["role"] == "huesped"
    assert response.data["user"]["username"] == "nuevo"


@pytest.mark.django_db
def test_registro_email_duplicado(api_client, huesped):
    response = api_client.post(
        "/api/v1/auth/registro/",
        {
            "email": huesped.email,
            "first_name": "Otro",
            "last_name": "User",
            "password": "Otrapass123!",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "detail" in response.data


@pytest.mark.django_db
def test_registro_propietario_pendiente(api_client):
    response = api_client.post(
        "/api/v1/auth/registro-propietario/",
        {
            "email": "nuevo_prop@hospy.local",
            "first_name": "Nuevo",
            "last_name": "Propietario",
            "password": "Nuevopass123!",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["user"]["role"] == "propietario"
    assert response.data["user"]["owner_status"] == "pendiente"


@pytest.mark.django_db
def test_propietario_pendiente_no_crea_hospedaje(api_client):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="pendiente@hospy.local",
        username="pendiente",
        password="Testpass123!",
        first_name="Pend",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.PENDIENTE,
    )
    api_client.force_authenticate(user=user)
    response = api_client.post(
        "/api/v1/hospedajes/",
        {
            "name": "Hotel X",
            "type": "hotel",
            "description": "Desc larga suficiente",
            "address": "Calle 1",
            "city": "Lima",
            "region": "Lima",
            "latitude": "-12.046400",
            "longitude": "-77.042800",
        },
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_aprueba_propietario(api_client, admin_user):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    owner = User.objects.create_user(
        email="por_aprobar@hospy.local",
        username="por_aprobar",
        password="Testpass123!",
        first_name="Por",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.PENDIENTE,
    )
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/v1/auth/propietarios/{owner.pk}/aprobar/",
        {"aprobado": True},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["owner_status"] == "aprobado"
    owner.refresh_from_db()
    assert owner.owner_status == User.OwnerStatus.APROBADO


@pytest.mark.django_db
def test_serializer_guarda_faqs(propietario):
    from rest_framework.test import APIRequestFactory

    from properties.serializers import AccommodationWriteSerializer

    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = propietario
    data = {
        "name": "Hostal FAQ",
        "type": "hostal",
        "description": "Descripción del hostal con suficiente texto.",
        "address": "Calle 1",
        "city": "Lima",
        "region": "Lima",
        "latitude": "-12.046400",
        "longitude": "-77.042800",
        "faqs": [
            {
                "question": "¿Hay desayuno incluido?",
                "answer": "Sí, desayuno continental de 7 a 10.",
            }
        ],
    }
    ser = AccommodationWriteSerializer(data=data, context={"request": request})
    assert ser.is_valid(), ser.errors
    acc = ser.save()
    assert acc.faqs.count() == 1


@pytest.mark.django_db
def test_hospedaje_con_faqs(api_client, propietario):
    api_client.force_authenticate(user=propietario)
    response = api_client.post(
        "/api/v1/hospedajes/",
        {
            "name": "Hostal FAQ",
            "type": "hostal",
            "description": "Descripción del hostal con suficiente texto.",
            "address": "Calle 1",
            "city": "Lima",
            "region": "Lima",
            "latitude": "-12.046400",
            "longitude": "-77.042800",
            "faqs": [
                {
                    "question": "¿Hay desayuno incluido?",
                    "answer": "Sí, desayuno continental de 7 a 10.",
                }
            ],
        },
        format="json",
    )
    assert response.status_code == 201
    assert len(response.data["faqs"]) == 1

    from properties.models import AccommodationFAQ

    acc_id = response.data["id"]
    assert AccommodationFAQ.objects.filter(accommodation_id=acc_id).count() == 1

    detail = api_client.get(f"/api/v1/hospedajes/{acc_id}/")
    assert detail.status_code == 200
    assert len(detail.data["faqs"]) == 1
    assert "desayuno" in detail.data["faqs"][0]["question"].lower()


@pytest.mark.django_db
def test_login(api_client, huesped):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": huesped.email, "password": "Testpass123!"},
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_config_contacto_usa_datos_administrador(api_client, admin_user):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.create_user(
        email="viejo@hospy.local",
        username="admin_viejo",
        password="Testpass123!",
        role=User.Role.ADMINISTRADOR,
        is_superuser=True,
    )
    admin_user.phone = "+51 902 192 870"
    admin_user.save(update_fields=["phone"])

    response = api_client.get("/api/v1/anuncios/config/")
    assert response.status_code == 200
    assert response.data["admin_email"] == admin_user.email
    assert "902" in response.data["admin_phone"]
    assert response.data["admin_whatsapp_url"].startswith("https://wa.me/")
