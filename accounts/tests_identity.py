import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_identity_lookup_and_verify_mock():
    user = User.objects.create_user(
        email="verify@test.local",
        username="verify_user",
        password="testpass123",
        first_name="Old",
        last_name="Name",
        role=User.Role.HUESPED,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    lookup = client.post("/api/v1/auth/identidad/consultar/", {"dni": "12345678"}, format="json")
    assert lookup.status_code == 200
    assert lookup.data["persona"]["numero"] == "12345678"

    verify = client.post(
        "/api/v1/auth/identidad/verificar/",
        {"dni": "12345678", "update_profile": True},
        format="json",
    )
    assert verify.status_code == 200
    user.refresh_from_db()
    assert user.is_identity_verified is True
    assert user.identity_document_number == "12345678"
    assert "verificado" in user.capability_roles()
