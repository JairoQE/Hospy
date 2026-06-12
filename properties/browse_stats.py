"""Estadísticas de inventario por bloque del home (tipo, región, departamento)."""

import unicodedata

from django.db.models import Avg, Count

from .models import Accommodation, BrowseTile
from .services import apply_accommodation_search_params, public_accommodations_queryset
from .ubigeo_loader import list_departamentos


def _norm_key(value: str) -> str:
    s = (value or "").strip().lower()
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def tile_stats_key(group: str, filter_value: str) -> str:
    return f"{group}|{_norm_key(filter_value)}"


def tile_search_params(group: str, filter_value: str) -> dict:
    if group == BrowseTile.Group.ACCOMMODATION_TYPE:
        return {"tipo": filter_value}
    if group == BrowseTile.Group.NATURAL_REGION:
        return {"zona": filter_value}
    if group == BrowseTile.Group.DEPARTMENT:
        return {"departamento": filter_value}
    return {}


def stats_for_search(search: dict) -> dict:
    if not search:
        return {"hotels_count": 0, "price_avg": None}

    qs = apply_accommodation_search_params(
        public_accommodations_queryset(),
        search,
    )
    agg = qs.aggregate(
        hotels_count=Count("id", distinct=True),
        price_avg=Avg("precio_desde"),
    )
    return {
        "hotels_count": agg["hotels_count"] or 0,
        "price_avg": float(agg["price_avg"]) if agg["price_avg"] is not None else None,
    }


def build_browse_tile_stats_map() -> dict[str, dict]:
    stats: dict[str, dict] = {}

    for value, _label in Accommodation.Type.choices:
        key = tile_stats_key(BrowseTile.Group.ACCOMMODATION_TYPE, value)
        stats[key] = stats_for_search({"tipo": value})

    for zona in ("costa", "sierra", "selva"):
        key = tile_stats_key(BrowseTile.Group.NATURAL_REGION, zona)
        stats[key] = stats_for_search({"zona": zona})

    for depto in list_departamentos():
        nombre = (depto.get("nombre") or "").strip()
        if not nombre:
            continue
        key = tile_stats_key(BrowseTile.Group.DEPARTMENT, nombre)
        stats[key] = stats_for_search({"departamento": nombre})

    return stats
