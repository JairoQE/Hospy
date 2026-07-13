from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model

from audit.models import AuditLog
from integrations.api_keys import hash_api_key
from integrations.auth import authenticate_integration_key
from integrations.ipguide import geo_hints_from_lookup, normalize_ipguide_payload
from integrations.models import IntegrationClient

User = get_user_model()


def test_normalize_ipguide_payload():
    raw = {
        "ip": "1.2.3.4",
        "network": {
            "cidr": "1.2.3.0/24",
            "autonomous_system": {
                "asn": 270068,
                "name": "AS270068 - DIT PERU",
                "organization": "DIT PERU SA",
                "country": "PE",
                "rir": "LACNIC",
            },
        },
        "location": {
            "city": "Lima",
            "country": "Peru",
            "timezone": "America/Lima",
            "latitude": -12.05,
            "longitude": -77.05,
        },
    }
    out = normalize_ipguide_payload(raw)
    assert out["country_code"] == "PE"
    assert out["city"] == "Lima"
    assert out["asn"] == 270068


def test_geo_hints_peru():
    hints = geo_hints_from_lookup(
        {
            "country_code": "PE",
            "country": "Peru",
            "city": "Arequipa",
            "timezone": "America/Lima",
        }
    )
    assert hints["detected"] is True
    assert hints["language"] == "es-PE"
    assert hints["currency"] == "PEN"


def test_geo_hints_foreign():
    hints = geo_hints_from_lookup(
        {
            "country_code": "US",
            "country": "United States",
            "city": "Chicago",
        }
    )
    assert hints["language"] == "en"
    assert hints["currency"] == "USD"


def test_integration_client_assign_and_authenticate(db):
    client = IntegrationClient.objects.create(
        name="SIST Demo",
        organization="Universidad",
        contact_email="integrador@uni.edu",
        status=IntegrationClient.Status.ACTIVE,
    )
    raw = client.assign_new_key()
    assert raw.startswith("hspy_")
    assert client.key_hash == hash_api_key(raw)

    auth = authenticate_integration_key(raw)
    assert auth is not None
    assert auth.client.pk == client.pk
    assert auth.legacy_env is False
    assert authenticate_integration_key("hspy_invalid") is None


def test_integration_client_revoked_denied(db):
    client = IntegrationClient.objects.create(
        name="Revocado",
        contact_email="x@y.com",
        status=IntegrationClient.Status.ACTIVE,
    )
    raw = client.assign_new_key()
    client.revoke()
    assert authenticate_integration_key(raw) is None


def test_integration_api_access_audits_registered_client(api_client, db, settings):
    settings.HOSPY_INTEGRATION_API_KEY = ""
    client = IntegrationClient.objects.create(
        name="Partner X",
        contact_email="partner@x.com",
        status=IntegrationClient.Status.ACTIVE,
    )
    raw = client.assign_new_key()

    response = api_client.get(
        "/api/v1/integracion/hospedajes/",
        HTTP_X_HOSPY_INTEGRATION_KEY=raw,
    )
    assert response.status_code == 200
    client.refresh_from_db()
    assert client.request_count == 1
    assert client.last_used_at is not None

    log = AuditLog.objects.filter(action="integration.api.access").first()
    assert log is not None
    assert log.actor_role == "integracion"
    assert log.actor_name == "Partner X"
    assert log.metadata.get("auth_mode") == "registered_client"


def test_request_approve_and_issue_key_via_api(db):
    user = User.objects.create_user(
        username="dev1",
        email="dev1@hospy.test",
        password="pass12345",
        role=User.Role.HUESPED,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    res = client.post(
        "/api/v1/integracion/clientes/mios/",
        {"name": "Portal Uni", "organization": "UNI"},
        format="json",
    )
    assert res.status_code == 201
    client_id = res.data["client"]["id"]
    assert res.data["client"]["status"] == "activo"

    res = client.post(f"/api/v1/integracion/clientes/mios/{client_id}/emitir-key/")
    assert res.status_code == 200
    raw = res.data["api_key"]
    assert raw.startswith("hspy_")
    assert authenticate_integration_key(raw) is not None
    assert AuditLog.objects.filter(action="integration.client.activate").exists()
    assert AuditLog.objects.filter(action="integration.client.issue_key").exists()
