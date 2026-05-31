import pytest

from properties.geography import expand_free_text_location_to_cities
from properties.ubigeo_loader import distrito_nombres_departamento


@pytest.mark.django_db
def test_ubigeo_tiene_25_departamentos_incluye_callao(api_client):
    r = api_client.get("/api/v1/ubigeo/departamentos/")
    assert r.status_code == 200
    assert len(r.data) == 25
    nombres = {d["nombre"] for d in r.data}
    assert "Callao" in nombres
    assert "Lima" in nombres


@pytest.mark.django_db
def test_ubigeo_callao_provincia_y_distritos(api_client):
    r = api_client.get("/api/v1/ubigeo/provincias/?departamento=Callao")
    assert r.status_code == 200
    assert len(r.data) == 1
    assert r.data[0]["nombre"] == "Callao"
    d = api_client.get(
        "/api/v1/ubigeo/distritos/?provincia=Callao&departamento=Callao"
    )
    assert d.status_code == 200
    assert len(d.data) == 6
    assert "Miraflores" not in {x["nombre"] for x in d.data}


@pytest.mark.django_db
def test_ubigeo_distritos_por_solo_departamento_huanuco(api_client):
    r = api_client.get("/api/v1/ubigeo/distritos/?departamento=Huánuco")
    assert r.status_code == 200
    assert len(r.data) >= 50
    nombres = {d["nombre"] for d in r.data}
    assert len(nombres) == len(r.data)
    assert "Rupa Rupa" in nombres or "Huánuco" in nombres


@pytest.mark.django_db
def test_ubigeo_provincia_maranon_huanuco(api_client):
    r = api_client.get("/api/v1/ubigeo/provincias/?departamento=Huánuco")
    assert r.status_code == 200
    nombres = [p["nombre"] for p in r.data]
    assert "Marañón" in nombres
    assert "Maraqon" not in nombres


@pytest.mark.django_db
def test_ubigeo_buscar_tingo_incluye_tingo_maria(api_client):
    r = api_client.get("/api/v1/ubigeo/buscar/?q=Tingo&limit=20")
    assert r.status_code == 200
    nombres = [x["nombre"] for x in r.data]
    assert any("Tingo María" in n or "Tingo Maria" in n for n in nombres), nombres


@pytest.mark.django_db
def test_ubigeo_buscar_huanuco(api_client):
    r = api_client.get("/api/v1/ubigeo/buscar/?q=huanu")
    assert r.status_code == 200
    nombres = [x["nombre"] for x in r.data]
    assert "Huánuco" in nombres


def test_expand_ciudad_libre_provincia_leoncio_prado_incluye_rupa_rupa():
    cities = expand_free_text_location_to_cities("Leoncio Prado")
    assert cities is not None
    norm = {c.lower().replace("-", " ") for c in cities}
    assert "rupa rupa" in norm


def test_expand_ciudad_libre_departamento_huanuco_sin_tilde():
    cities = expand_free_text_location_to_cities("Huanuco")
    assert cities is not None
    assert len(cities) >= 10


def test_expand_ciudad_libre_tingo_maria_mapear_a_rupa_rupa():
    cities = expand_free_text_location_to_cities("Tingo María")
    assert cities is not None
    norm = {c.lower().replace("-", " ").strip() for c in cities}
    assert "rupa rupa" in norm


@pytest.mark.django_db
def test_hospedajes_ciudad_libre_como_provincia_leoncio_prado(
    api_client, hospedaje_aprobado
):
    acc, _room = hospedaje_aprobado
    acc.city = "Rupa-Rupa"
    acc.save(update_fields=["city"])
    r = api_client.get("/api/v1/hospedajes/?ciudad=Leoncio Prado")
    assert r.status_code == 200
    ids = [x["id"] for x in r.data["results"]]
    assert acc.id in ids


@pytest.mark.django_db
def test_hospedajes_ciudad_libre_como_departamento_huanuco(
    api_client, hospedaje_aprobado
):
    distritos = distrito_nombres_departamento("Huánuco")
    assert distritos
    acc, _room = hospedaje_aprobado
    acc.city = distritos[0]
    acc.save(update_fields=["city"])
    r = api_client.get("/api/v1/hospedajes/?ciudad=huanuco")
    assert r.status_code == 200
    ids = [x["id"] for x in r.data["results"]]
    assert acc.id in ids


def test_ubigeo_alias_maraqon_resuelve_maranon(api_client):
    from properties.ubigeo_loader import resolve_provincia

    prov = resolve_provincia("Maraqon", "Huánuco")
    assert prov is not None
    assert prov["nombre"] == "Marañón"


def test_ubigeo_lista_todas_provincias_lima(api_client):
    r = api_client.get("/api/v1/ubigeo/provincias/?departamento=Lima")
    assert r.status_code == 200
    assert len(r.data) >= 9
    nombres = {p["nombre"] for p in r.data}
    assert "Lima" in nombres
    assert "Callao" not in nombres


@pytest.mark.django_db
def test_ubigeo_distritos_provincia_lima(api_client):
    r = api_client.get("/api/v1/ubigeo/distritos/?provincia=Lima&departamento=Lima")
    assert r.status_code == 200
    assert len(r.data) >= 40
    nombres = {d["nombre"] for d in r.data}
    assert "Miraflores" in nombres


@pytest.mark.django_db
def test_busqueda_por_distrito(api_client, hospedaje_aprobado):
    acc, _room = hospedaje_aprobado
    acc.city = "Miraflores"
    acc.save(update_fields=["city"])
    r = api_client.get(
        "/api/v1/hospedajes/?distrito=Miraflores&departamento=Lima&provincia=Lima"
    )
    assert r.status_code == 200
    ids = [x["id"] for x in r.data["results"]]
    assert acc.id in ids
