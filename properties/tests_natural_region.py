import pytest

from properties.natural_region import (
    get_provincia_zona_for_item,
    group_by_zona,
    provincias_by_zona,
)
from properties.ubigeo_loader import list_departamentos, list_provincias


@pytest.mark.django_db
def test_todas_las_provincias_tienen_zona():
    mapping_count = 0
    for depto in list_departamentos():
        for prov in list_provincias(depto["nombre"]):
            zona = get_provincia_zona_for_item(prov)
            assert zona in ("costa", "sierra", "selva"), prov
            mapping_count += 1
    assert mapping_count == 194


def test_huanuco_sierra_y_selva():
    by_zona = provincias_by_zona("Huanuco")
    sierra = {p["nombre"] for p in by_zona["sierra"]}
    selva = {p["nombre"] for p in by_zona["selva"]}
    assert "Huanuco" in sierra or "Huánuco" in sierra
    assert "Leoncio Prado" in selva
    assert "Puerto Inca" in selva
    assert "Pachitea" in selva
    assert len(sierra) >= 5
    assert len(selva) >= 4


def test_group_by_zona_orden():
    items = [
        {"nombre": "A", "zona_natural": "selva"},
        {"nombre": "B", "zona_natural": "costa"},
        {"nombre": "C", "zona_natural": "sierra"},
    ]
    groups = group_by_zona(items)
    assert [g["zona"] for g in groups] == ["costa", "sierra", "selva"]


@pytest.mark.django_db
def test_api_provincias_incluye_zona_natural(api_client):
    r = api_client.get("/api/v1/ubigeo/provincias/?departamento=Huanuco")
    assert r.status_code == 200
    zonas = {row["zona_natural"] for row in r.data}
    assert "sierra" in zonas
    assert "selva" in zonas
