import pytest
from django.test import override_settings


@pytest.mark.django_db
def test_protocolos_intercambio_lists_seven_protocols(api_client):
    response = api_client.get("/api/v1/sistema/protocolos/")
    assert response.status_code == 200
    data = response.json()
    assert data["metric"] == "CIn-2-G"
    assert data["B"] == 7
    assert len(data["protocols"]) == 7
    assert data["A"] == sum(1 for p in data["protocols"] if p["supported"])
    assert data["X"] == round(data["A"] / data["B"], 4)


@pytest.mark.django_db
def test_sistema_index_links(api_client):
    response = api_client.get("/api/v1/sistema/")
    assert response.status_code == 200
    docs = response.json()["documentation"]
    assert "protocolos_intercambio" in docs
    assert docs["protocolos_intercambio"].endswith("/api/v1/sistema/protocolos/")
    assert "interfaces_externas" in docs
    assert docs["interfaces_externas"].endswith("/api/v1/sistema/interfaces/")


@pytest.mark.django_db
@override_settings(HOSPY_INTEGRATION_API_KEY="test-key")
def test_protocol_p06_supported_when_key_configured(api_client):
    response = api_client.get("/api/v1/sistema/protocolos/")
    p06 = next(p for p in response.json()["protocols"] if p["id"] == "P-06")
    assert p06["supported"] is True


@pytest.mark.django_db
def test_interfaces_lists_nine_entries(api_client):
    response = api_client.get("/api/v1/sistema/interfaces/")
    assert response.status_code == 200
    data = response.json()
    assert data["metric"] == "CIn-3-S"
    assert data["B"] == 9
    assert len(data["interfaces"]) == 9
    assert data["A"] == sum(1 for i in data["interfaces"] if i["functional"])
    assert data["X"] == round(data["A"] / data["B"], 4)


@pytest.mark.django_db
@override_settings(HOSPY_INTEGRATION_API_KEY="test-key", IP_GUIDE_ENABLED=True)
def test_interface_if02_functional_with_key(api_client, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://hospy.pages.dev")
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", "g")
    monkeypatch.setenv("FACEBOOK_APP_ID", "f")
    monkeypatch.setenv("FACEBOOK_APP_SECRET", "s")
    monkeypatch.setenv("USE_CLOUDINARY", "true")
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "demo")
    with override_settings(
        HOSPY_INTEGRATION_API_KEY="test-key",
        TURNSTILE_SITE_KEY="site",
        TURNSTILE_SECRET_KEY="secret",
        IP_GUIDE_ENABLED=True,
    ):
        response = api_client.get("/api/v1/sistema/interfaces/")
    data = response.json()
    assert data["A"] == 9
    assert data["X"] == 1.0
