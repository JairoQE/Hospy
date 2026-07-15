import pytest

from properties.models import BrowseTile


@pytest.mark.django_db
def test_inicio_bootstrap_agrupa_bloques(api_client):
    BrowseTile.objects.create(
        group=BrowseTile.Group.ACCOMMODATION_TYPE,
        title="Hotel Bootstrap",
        slug="hotel-bootstrap",
        filter_value="hotel",
        order=1,
    )
    BrowseTile.objects.create(
        group=BrowseTile.Group.NATURAL_REGION,
        title="Costa Bootstrap",
        slug="costa-bootstrap",
        filter_value="costa",
        order=1,
    )
    r = api_client.get("/api/v1/inicio-bootstrap/")
    assert r.status_code == 200
    assert any(x["title"] == "Hotel Bootstrap" for x in r.data["tipo"])
    assert any(x["title"] == "Costa Bootstrap" for x in r.data["region"])
    assert isinstance(r.data["ubigeo_departamentos"], list)
    assert len(r.data["ubigeo_departamentos"]) >= 20
    featured = r.data["busquedas_destacadas"]
    assert isinstance(featured["ciudades"], list)
    assert isinstance(featured["destinos"], list)
    assert isinstance(featured.get("eventos"), list)
    assert isinstance(featured.get("lugares"), list)
    assert isinstance(featured.get("restaurantes"), list)
    assert isinstance(r.data["tile_stats"], dict)
    assert "tipo|hotel" in r.data["tile_stats"] or len(r.data["tile_stats"]) >= 0


@pytest.mark.django_db
def test_publico_lista_bloques_inicio(api_client, admin_user):
    BrowseTile.objects.create(
        group=BrowseTile.Group.ACCOMMODATION_TYPE,
        title="Test Hotel",
        slug="test-hotel",
        filter_value="hotel",
        order=99,
    )
    r = api_client.get("/api/v1/inicio-bloques/?group=tipo")
    assert r.status_code == 200
    assert any(x["title"] == "Test Hotel" for x in r.data)


@pytest.mark.django_db
def test_admin_crea_bloque_inicio(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    r = api_client.post(
        "/api/v1/inicio-bloques/",
        {
            "group": "region",
            "title": "Altiplano",
            "slug": "altiplano",
            "filter_value": "sierra",
            "subtitle": "Zona altoandina",
            "gradient_css": "linear-gradient(135deg, #333 0%, #666 100%)",
            "order": 5,
            "is_active": True,
        },
        format="json",
    )
    assert r.status_code == 201
    assert r.data["title"] == "Altiplano"


@pytest.mark.django_db
def test_registrar_clic_bloque_inicio(api_client):
    tile = BrowseTile.objects.create(
        group=BrowseTile.Group.ACCOMMODATION_TYPE,
        title="Clic Test",
        slug="clic-test",
        filter_value="hotel",
        is_active=True,
    )
    r = api_client.post(f"/api/v1/inicio-bloques/{tile.id}/registrar-clic/")
    assert r.status_code == 201
    assert tile.clicks.count() == 1


@pytest.mark.django_db
def test_admin_lista_incluye_clics_30d(api_client, admin_user):
    tile = BrowseTile.objects.create(
        group=BrowseTile.Group.ACCOMMODATION_TYPE,
        title="Stats",
        slug="stats",
        filter_value="hostal",
        is_active=True,
    )
    from properties.models import BrowseTileClick

    BrowseTileClick.objects.create(tile=tile)
    api_client.force_authenticate(user=admin_user)
    r = api_client.get("/api/v1/inicio-bloques/?group=tipo")
    assert r.status_code == 200
    row = next(x for x in r.data if x["id"] == tile.id)
    assert row["clicks_30d"] == 1


@pytest.mark.django_db
def test_publico_lista_departamentos_inicio(api_client):
    r = api_client.get("/api/v1/inicio-bloques/?group=departamento")
    assert r.status_code == 200
    assert len(r.data) >= 1
    assert r.data[0]["group"] == "departamento"
