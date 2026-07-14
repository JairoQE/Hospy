import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.payout import ruc_check_digit, validate_ruc
from organizations.models import Organization

User = get_user_model()

# RUC SUNAT común (dígito verificador válido)
VALID_RUC = "20100070970"


def test_validate_ruc_ok():
    assert validate_ruc(VALID_RUC) == VALID_RUC
    assert ruc_check_digit(VALID_RUC[:10]) == int(VALID_RUC[10])


def test_validate_ruc_rejects_bad_checksum():
    with pytest.raises(ValueError, match="dígito verificador"):
        validate_ruc("20100070971")


@pytest.mark.django_db
def test_organization_create_and_verify_ruc_mock():
    user = User.objects.create_user(
        email="org@test.local",
        username="org_owner",
        password="testpass123",
        first_name="Dueño",
        last_name="Hotel",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    create = client.post(
        "/api/v1/empresas/mia/",
        {
            "name": "Hotel Demo",
            "description": "Hospedaje de prueba",
            "location": "Lima",
            "is_published": True,
        },
        format="json",
    )
    assert create.status_code == 201
    assert create.data["organization"]["slug"]
    assert create.data["organization"]["is_verified"] is False

    lookup = client.post(
        "/api/v1/empresas/mia/ruc/consultar/",
        {"ruc": VALID_RUC},
        format="json",
    )
    assert lookup.status_code == 200
    assert lookup.data["empresa"]["ruc"] == VALID_RUC
    assert lookup.data["empresa"]["legal_name"]

    verify = client.post(
        "/api/v1/empresas/mia/ruc/verificar/",
        {"ruc": VALID_RUC},
        format="json",
    )
    assert verify.status_code == 200
    org = Organization.objects.get(created_by=user)
    assert org.is_verified is True
    assert org.ruc == VALID_RUC
    assert org.legal_name

    slug = org.slug
    public = client.get(f"/api/v1/empresas/{slug}/")
    assert public.status_code == 200
    assert public.data["is_verified"] is True
    assert public.data["name"] == "Hotel Demo"
