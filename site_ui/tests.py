import pytest

from site_ui.models import SiteDesignSettings


@pytest.mark.django_db
def test_publico_lee_diseno(api_client):
    r = api_client.get("/api/v1/diseno/")
    assert r.status_code == 200
    assert r.data["primary_color"] == "#0d6e6e"


@pytest.mark.django_db
def test_admin_actualiza_diseno(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    r = api_client.patch(
        "/api/v1/diseno/",
        {"primary_color": "#2563eb", "accent_color": "#f97316"},
        format="json",
    )
    assert r.status_code == 200
    assert r.data["primary_color"] == "#2563eb"
    assert SiteDesignSettings.load().primary_color == "#2563eb"
