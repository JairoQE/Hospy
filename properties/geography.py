"""Ubicaciones de Perú para filtros de búsqueda (zona, departamento, provincia, distrito)."""

from .natural_region import distrito_nombres_zona_departamento
from .ubigeo_loader import (
    distrito_nombres_departamento,
    distrito_nombres_provincia,
    resolve_departamento,
    resolve_provincia,
)

# Ciudades representativas por zona natural (coinciden con campo city del hospedaje)
ZONA_CIUDADES: dict[str, list[str]] = {
    "costa": [
        "Lima",
        "Miraflores",
        "Barranco",
        "San Isidro",
        "Trujillo",
        "Piura",
        "Chiclayo",
        "Tumbes",
        "Ica",
        "Huacho",
        "Chimbote",
        "Talara",
    ],
    "sierra": [
        "Cusco",
        "Arequipa",
        "Puno",
        "Huancayo",
        "Ayacucho",
        "Cajamarca",
        "Huánuco",
        "Huaraz",
        "Tacna",
        "Abancay",
        "Cerro de Pasco",
    ],
    "selva": [
        "Iquitos",
        "Tarapoto",
        "Pucallpa",
        "Puerto Maldonado",
        "Moyobamba",
        "Yurimaguas",
        "Tingo María",
    ],
}


def get_zona_cities(zona: str, departamento: str | None = None) -> list[str]:
    z = (zona or "").lower().strip()
    if departamento:
        scoped = distrito_nombres_zona_departamento(z, departamento)
        if scoped:
            return scoped
    return ZONA_CIUDADES.get(z, [])


def get_departamento_cities(departamento: str) -> list[str]:
    """Todos los distritos del departamento (campo city suele coincidir con el distrito)."""
    return distrito_nombres_departamento(departamento)


def get_provincia_cities(provincia: str, departamento: str | None = None) -> list[str]:
    """Distritos de la provincia."""
    names = distrito_nombres_provincia(provincia, departamento)
    if names:
        return names
    key = (provincia or "").strip()
    return [key] if key else []


def get_distrito_search_names(distrito: str) -> list[str]:
    name = (distrito or "").strip()
    return [name] if name else []
