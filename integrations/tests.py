import pytest
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


@pytest.mark.django_db
def test_actify_events_proxy_mocked(monkeypatch, settings):
    settings.ACTIFY_API_KEY = "test-key"
    settings.ACTIFY_BASE_URL = "https://actify.example/api/v1"

    sample = [
        {
            "id": 3,
            "name": "Hackathon SGE 2026",
            "description": "Desafío de desarrollo",
            "start_date": "2026-07-17T17:08:34.477-05:00",
            "end_date": "2026-07-19T17:08:34.477-05:00",
            "status": "published",
            "capacity": {
                "max_capacity": 100,
                "sold_tickets": 0,
                "available_spots": 100,
                "is_sold_out": False,
            },
            "location": {
                "city": "Lima",
                "address": "Miraflores",
                "latitude": "-12.12",
                "longitude": "-77.02",
            },
            "category": {"name": "Tecnología", "slug": "tecnologia"},
            "organizer": {"name": "Admin"},
            "ticket_types": [{"name": "General", "price": "20.0", "currency": "PEN"}],
        }
    ]

    def fake_list(*, params=None):
        from integrations.actify import list_events as real_list
        # call normalization via monkeypatch of _request instead
        return {
            "events": [
                {
                    "id": 3,
                    "name": "Hackathon SGE 2026",
                    "description": "Desafío",
                    "start_date": sample[0]["start_date"],
                    "end_date": sample[0]["end_date"],
                    "status": "published",
                    "capacity": sample[0]["capacity"],
                    "location": sample[0]["location"],
                    "category": sample[0]["category"],
                    "organizer": sample[0]["organizer"],
                    "ticket_types": sample[0]["ticket_types"],
                    "image_url": None,
                    "source": "actify",
                }
            ],
            "count": 1,
            "meta": {},
            "provider": "actify",
        }

    monkeypatch.setattr("integrations.actify.list_events", fake_list)
    monkeypatch.setattr(
        "integrations.actify.get_event",
        lambda pk: fake_list()["events"][0],
    )

    client = APIClient()
    listed = client.get("/api/v1/eventos/")
    assert listed.status_code == 200
    assert listed.data["count"] == 1
    assert listed.data["events"][0]["name"] == "Hackathon SGE 2026"

    detail = client.get("/api/v1/eventos/3/")
    assert detail.status_code == 200
    assert detail.data["id"] == 3


@pytest.mark.django_db
def test_conecta_tingo_proxy_mocked(monkeypatch, settings):
    settings.CONECTA_TINGO_API_KEY = "ct_test_key"
    settings.CONECTA_TINGO_BASE_URL = "https://conectatingo.example/api/integracion"

    sample = {
        "status": "success",
        "timestamp": "2026-07-15T01:00:00-05:00",
        "version": "1.0",
        "data": {
            "hoteles": {
                "descripcion": "Mapa de calor",
                "metricas": [
                    {
                        "destino": "Cueva las Lechuzas",
                        "zona": "Tingo María",
                        "nivel_interes": "9",
                    },
                    {
                        "destino": "Laguna de los Milagros",
                        "zona": "Tingo María",
                        "nivel_interes": "8",
                    },
                ],
            },
            "restaurantes": {"descripcion": "", "metricas": []},
            "movilidad": {"descripcion": "", "metricas": []},
            "eventos": {
                "descripcion": "",
                "metricas": [
                    {"lugar": "Cueva las Lechuzas", "precio_entrada": "10 soles"},
                ],
            },
        },
    }

    monkeypatch.setattr(
        "integrations.conecta_tingo.fetch_datos",
        lambda force_refresh=False: sample,
    )

    client = APIClient()
    listed = client.get("/api/v1/lugares-turisticos/")
    assert listed.status_code == 200
    assert listed.data["provider"] == "conecta_tingo"
    assert listed.data["hotspots"][0]["name"] == "Cueva las Lechuzas"
    assert listed.data["hotspots"][0]["entry_price"] == "10 soles"
    assert listed.data["hotspots"][0]["latitude"] is not None


@pytest.mark.django_db
def test_restopoint_proxy_mocked(monkeypatch, settings):
    settings.RESTOPOINT_API_KEY = "rp_test_key"
    settings.RESTOPOINT_BASE_URL = (
        "https://restopoint.example/api/v1/developer-api"
    )

    sample_list = {
        "restaurants": [
            {
                "id": "a1b2",
                "name": "El Fogón de la Selva",
                "address": "Jr. Raymondi 123",
                "district": "Rupa Rupa",
                "city": "Tingo María",
                "region": "Huánuco",
                "latitude": -9.2953,
                "longitude": -75.9975,
                "avg_rating": 4.6,
                "total_capacity": 40,
                "cover_image_url": "https://example.com/cover.jpg",
                "logo_url": "https://example.com/logo.jpg",
                "image_url": "https://example.com/cover.jpg",
                "maps_url": "https://www.google.com/maps?q=-9.2953,-75.9975",
                "source": "restopoint",
            }
        ],
        "count": 1,
        "page": 0,
        "size": 50,
        "provider": "restopoint",
        "success": True,
    }

    monkeypatch.setattr(
        "integrations.restopoint.list_restaurants",
        lambda *, page=0, size=50: sample_list,
    )
    monkeypatch.setattr(
        "integrations.restopoint.get_restaurant",
        lambda pk: sample_list["restaurants"][0],
    )

    client = APIClient()
    listed = client.get("/api/v1/restaurantes/")
    assert listed.status_code == 200
    assert listed.data["count"] == 1
    assert listed.data["restaurants"][0]["name"] == "El Fogón de la Selva"

    detail = client.get("/api/v1/restaurantes/a1b2/")
    assert detail.status_code == 200
    assert detail.data["id"] == "a1b2"
