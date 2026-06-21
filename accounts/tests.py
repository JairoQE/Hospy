from unittest.mock import patch

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
def test_admin_lista_todos_usuarios(api_client, admin_user, huesped, propietario):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/v1/auth/admin-usuarios/")
    assert response.status_code == 200
    assert response.data["count"] >= 2
    emails = {row["email"] for row in response.data["results"]}
    assert huesped.email in emails
    assert propietario.email in emails


@pytest.mark.django_db
def test_lista_usuarios_solo_admin(api_client, huesped):
    api_client.force_authenticate(user=huesped)
    response = api_client.get("/api/v1/auth/admin-usuarios/")
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
def test_captcha_config_disabled(api_client):
    response = api_client.get("/api/v1/auth/captcha/")
    assert response.status_code == 200
    assert response.data["enabled"] is False


@pytest.mark.django_db
@patch("accounts.captcha.requests.post")
def test_login_requiere_captcha_cuando_activo(mock_post, api_client, huesped, settings):
    settings.TURNSTILE_SECRET_KEY = "test-secret"
    settings.TURNSTILE_SITE_KEY = "test-site"

    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": huesped.email, "password": "Testpass123!"},
        format="json",
    )
    assert response.status_code == 400
    assert "captcha_token" in response.data.get("errors", response.data)

    mock_post.return_value.json.return_value = {"success": True}
    mock_post.return_value.raise_for_status = lambda: None

    response = api_client.post(
        "/api/v1/auth/login/",
        {
            "email": huesped.email,
            "password": "Testpass123!",
            "captcha_token": "valid-token",
        },
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
@patch("accounts.captcha.requests.post")
def test_registro_requiere_captcha_cuando_activo(mock_post, api_client, settings):
    settings.TURNSTILE_SECRET_KEY = "test-secret"
    settings.TURNSTILE_SITE_KEY = "test-site"

    payload = {
        "email": "captcha@hospy.local",
        "first_name": "Cap",
        "last_name": "Tcha",
        "password": "Nuevopass123!",
    }
    response = api_client.post("/api/v1/auth/registro/", payload, format="json")
    assert response.status_code == 400

    mock_post.return_value.json.return_value = {"success": True}
    mock_post.return_value.raise_for_status = lambda: None

    response = api_client.post(
        "/api/v1/auth/registro/",
        {**payload, "captcha_token": "valid-token"},
        format="json",
    )
    assert response.status_code == 201


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


@pytest.mark.django_db
@patch("accounts.views.verify_google_credential")
def test_google_auth_registro(mock_verify, api_client):
    mock_verify.return_value = {
        "sub": "google-sub-123",
        "email": "google.user@hospy.local",
        "email_verified": True,
        "given_name": "Google",
        "family_name": "User",
        "iss": "accounts.google.com",
    }
    response = api_client.post(
        "/api/v1/auth/google/",
        {"credential": "fake-jwt", "role": "huesped"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["created"] is True
    assert response.data["user"]["email"] == "google.user@hospy.local"
    assert "access" in response.data


@pytest.mark.django_db
@patch("accounts.views.verify_google_credential")
def test_google_auth_login_sin_cuenta(mock_verify, api_client):
    mock_verify.return_value = {
        "sub": "google-sub-999",
        "email": "nuevo.google@hospy.local",
        "email_verified": True,
        "given_name": "Nuevo",
        "family_name": "Google",
        "iss": "accounts.google.com",
    }
    response = api_client.post(
        "/api/v1/auth/google/",
        {"credential": "fake-jwt", "role": "login"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
@patch("accounts.views.verify_facebook_access_token")
def test_facebook_auth_registro(mock_verify, api_client):
    mock_verify.return_value = {
        "id": "fb-123",
        "email": "fb.user@hospy.local",
        "first_name": "Fb",
        "last_name": "User",
    }
    response = api_client.post(
        "/api/v1/auth/facebook/",
        {"access_token": "fake-token", "role": "huesped"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["created"] is True
    assert response.data["user"]["email"] == "fb.user@hospy.local"


@pytest.mark.django_db
def test_cambiar_email_con_contrasena(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        "/api/v1/auth/perfil/cambiar-email/",
        {
            "email": "admin_nuevo@hospy.local",
            "current_password": "Testpass123!",
        },
        format="json",
    )
    assert response.status_code == 200
    admin_user.refresh_from_db()
    assert admin_user.email == "admin_nuevo@hospy.local"
    assert response.data["user"]["email"] == "admin_nuevo@hospy.local"


@pytest.mark.django_db
def test_cambiar_email_contrasena_incorrecta(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        "/api/v1/auth/perfil/cambiar-email/",
        {
            "email": "otro@hospy.local",
            "current_password": "Malapass!",
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_perfil_no_permite_cambiar_email_directo(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.patch(
        "/api/v1/auth/perfil/",
        {"email": "hack@hospy.local"},
        format="json",
    )
    assert response.status_code == 200
    admin_user.refresh_from_db()
    assert admin_user.email != "hack@hospy.local"


@pytest.mark.django_db
def test_cambiar_contrasena(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        "/api/v1/auth/perfil/cambiar-contrasena/",
        {
            "current_password": "Testpass123!",
            "new_password": "Nuevopass456!",
            "new_password2": "Nuevopass456!",
        },
        format="json",
    )
    assert response.status_code == 200
    admin_user.refresh_from_db()
    assert admin_user.check_password("Nuevopass456!")


@pytest.mark.django_db
def test_cambiar_contrasena_sin_coincidencia(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        "/api/v1/auth/perfil/cambiar-contrasena/",
        {
            "current_password": "Testpass123!",
            "new_password": "Nuevopass456!",
            "new_password2": "Distinta789!",
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_asigna_administrador(api_client, admin_user, huesped):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/v1/auth/admin-usuarios/{huesped.id}/administrador/",
        {"admin": True},
        format="json",
    )
    assert response.status_code == 200
    huesped.refresh_from_db()
    assert huesped.role == "administrador"
    assert huesped.is_staff is True


@pytest.mark.django_db
def test_admin_quita_administrador(api_client, admin_user, huesped):
    huesped.role = huesped.Role.ADMINISTRADOR
    huesped.is_staff = True
    huesped.save(update_fields=["role", "is_staff"])
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/v1/auth/admin-usuarios/{huesped.id}/administrador/",
        {"admin": False},
        format="json",
    )
    assert response.status_code == 200
    huesped.refresh_from_db()
    assert huesped.role == "huesped"
    assert huesped.is_staff is False


@pytest.mark.django_db
def test_no_quitar_ultimo_administrador(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/v1/auth/admin-usuarios/{admin_user.id}/administrador/",
        {"admin": False},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_solo_admin_asigna_administrador(api_client, huesped, propietario):
    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        f"/api/v1/auth/admin-usuarios/{propietario.id}/administrador/",
        {"admin": True},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_perfil_propietario_payout_fields(api_client, propietario):
    api_client.force_authenticate(user=propietario)
    response = api_client.get("/api/v1/auth/perfil/")
    assert response.status_code == 200
    assert response.data["payout_profile_complete"] is True
    assert response.data["payout_missing_fields"] == []


@pytest.mark.django_db
def test_perfil_guarda_payout_incompleto(api_client):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    owner = User.objects.create_user(
        email="sin_payout@hospy.local",
        username="sin_payout",
        password="Testpass123!",
        first_name="Sin",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
    )
    api_client.force_authenticate(user=owner)
    response = api_client.get("/api/v1/auth/perfil/")
    assert response.data["payout_profile_complete"] is False
    assert "phone" in response.data["payout_missing_fields"]

    response = api_client.patch(
        "/api/v1/auth/perfil/",
        {
            "phone": "999111222",
            "payout_document_number": "12345678",
        },
        format="json",
    )
    assert response.status_code == 200
    assert response.data["payout_profile_complete"] is True


@pytest.mark.django_db
def test_reserva_permitida_sin_mercado_pago(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    owner = room.accommodation.owner
    owner.payout_mp_email = ""
    owner.payout_bank_cci = ""
    owner.save()

    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        "/api/v1/reservas/preview/",
        {
            "room": room.id,
            "check_in": "2030-06-01",
            "check_out": "2030-06-03",
        },
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_reserva_bloqueada_sin_payout(api_client, huesped, hospedaje_aprobado):
    _, room = hospedaje_aprobado
    owner = room.accommodation.owner
    owner.phone = ""
    owner.payout_document_number = ""
    owner.payout_mp_email = ""
    owner.save()

    api_client.force_authenticate(user=huesped)
    response = api_client.post(
        "/api/v1/reservas/preview/",
        {
            "room": room.id,
            "check_in": "2030-06-01",
            "check_out": "2030-06-03",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "datos" in str(response.data).lower()


@pytest.mark.django_db
def test_usuario_seguidores_y_siguiendo(api_client, huesped, propietario):
    from accounts.models import UserFollow

    UserFollow.objects.create(follower=huesped, following=propietario)
    UserFollow.objects.create(follower=propietario, following=huesped)

    followers = api_client.get(f"/api/v1/auth/usuarios/{propietario.pk}/seguidores/")
    assert followers.status_code == 200
    assert followers.data["count"] == 1
    assert followers.data["results"][0]["id"] == huesped.pk
    assert followers.data["results"][0]["display_name"]

    following = api_client.get(f"/api/v1/auth/usuarios/{huesped.pk}/siguiendo/")
    assert following.status_code == 200
    assert following.data["count"] == 1
    assert following.data["results"][0]["id"] == propietario.pk

    api_client.force_authenticate(user=huesped)
    followers_auth = api_client.get(f"/api/v1/auth/usuarios/{propietario.pk}/seguidores/")
    assert followers_auth.data["results"][0]["is_following"] is False


@pytest.mark.django_db
def test_usuario_reservas_y_resenas_publicas(api_client, huesped, hospedaje_aprobado):
    from bookings.models import Booking
    from reviews.models import Review

    acc, room = hospedaje_aprobado

    booking = Booking.objects.create(
        guest=huesped,
        room=room,
        check_in="2026-01-10",
        check_out="2026-01-12",
        total_amount="240.00",
        status=Booking.Status.COMPLETADA,
    )
    Review.objects.create(
        accommodation=acc,
        booking=booking,
        author=huesped,
        rating=5,
        comment="Excelente estadía.",
        status=Review.Status.APROBADA,
        category_ratings={"limpieza": 5},
    )

    bookings = api_client.get(f"/api/v1/auth/usuarios/{huesped.pk}/reservas-publicas/")
    assert bookings.status_code == 200
    assert bookings.data["count"] == 1
    assert bookings.data["results"][0]["hospedaje"] == acc.name

    reviews = api_client.get(f"/api/v1/auth/usuarios/{huesped.pk}/resenas-publicas/")
    assert reviews.status_code == 200
    assert reviews.data["count"] == 1
    assert reviews.data["results"][0]["habitacion"] == room.number
