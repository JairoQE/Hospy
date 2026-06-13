"""Ubicaciones de Perú para filtros de búsqueda (zona, departamento, provincia, distrito)."""

from .natural_region import distrito_nombres_zona_departamento
from .ubigeo_loader import (
    distrito_nombres_departamento,
    distrito_nombres_provincia,
    resolve_departamento,
    resolve_provincia,
    search_places,
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


def district_name_variants(names: list[str]) -> list[str]:
    """Incluye guión/espacio (ej. Rupa Rupa vs Rupa-Rupa) para coincidir con `Accommodation.city`."""
    out: set[str] = set()
    for n in names:
        if not n:
            continue
        s = n.strip()
        out.add(s)
        out.add(s.replace(" ", "-"))
        out.add(s.replace("-", " "))
    return list(out)


def expand_free_text_location_to_cities(text: str) -> list[str] | None:
    """
    Si el texto coincide con un departamento o provincia UBIGEO, devuelve nombres de distrito
    para filtrar `Accommodation.city` (búsqueda libre sin elegir del autocompletado).
    """
    raw = (text or "").strip()
    if not raw:
        return None

    # Caso: "ciudades capital" (ej. Tingo María) usadas por Hospy como `city`.
    # En UBIGEO normalmente no aparecen como distrito; por eso mapeamos el texto
    # libre a su distrito representativo.
    def _norm_local(value: str) -> str:
        import unicodedata

        s = (value or "").strip().lower()
        s = unicodedata.normalize("NFD", s)
        return "".join(c for c in s if unicodedata.category(c) != "Mn")

    norm_raw = _norm_local(raw)

    def _with_raw(names: list[str]) -> list[str]:
        merged = set(district_name_variants(names))
        merged.update(district_name_variants([raw]))
        return list(merged)

    depto = resolve_departamento(raw)
    if depto:
        names = distrito_nombres_departamento(raw)
        if names:
            return _with_raw(names)

    prov = resolve_provincia(raw, None)
    if prov:
        names = distrito_nombres_provincia(
            prov["nombre"],
            prov.get("departamento_nombre"),
        )
        if names:
            return _with_raw(names)

    try:
        suggestions = search_places(raw, limit=20)
    except Exception:
        suggestions = []
    if suggestions:
        exact = next(
            (
                s
                for s in suggestions
                if _norm_local(s.get("nombre") or "") == norm_raw
                and s.get("tipo") == "distrito"
            ),
            None,
        )
        if exact:
            mapped_city = exact.get("ciudad") or exact.get("distrito") or exact.get("nombre")
            if mapped_city:
                return _with_raw([mapped_city])

    return None
