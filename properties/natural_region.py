"""
Clasificación costa / sierra / selva por provincia (código UBIGEO de 4 dígitos).

Fuentes: INEI (regiones naturales), división política UBIGEO y relieve por provincia.
Departamentos con una sola región usan valor por defecto; los demás tienen asignación explícita.
"""

from __future__ import annotations

from functools import lru_cache

from .ubigeo_loader import list_departamentos, list_provincias

Zona = str  # "costa" | "sierra" | "selva"

ZONA_ORDER = ("costa", "sierra", "selva")
ZONA_LABELS = {
    "costa": "Costa",
    "sierra": "Sierra",
    "selva": "Selva",
}

# Departamentos homogéneos (todas sus provincias comparten zona).
_DEPT_DEFAULT: dict[str, Zona] = {
    "03": "sierra",  # Apurímac
    "05": "sierra",  # Ayacucho
    "06": "sierra",  # Cajamarca
    "07": "costa",  # Callao
    "09": "sierra",  # Huancavelica
    "11": "costa",  # Ica
    "14": "costa",  # Lambayeque
    "16": "selva",  # Loreto
    "17": "selva",  # Madre de Dios
    "21": "sierra",  # Puno
    "22": "selva",  # San Martín
    "24": "costa",  # Tumbes
    "25": "selva",  # Ucayali
}

# Provincias en departamentos con más de una región natural.
_PROVINCE_ZONA: dict[str, Zona] = {
    # Amazonas
    "0101": "sierra",  # Chachapoyas
    "0102": "selva",  # Bagua
    "0103": "sierra",  # Bongará
    "0104": "selva",  # Condorcanqui
    "0105": "sierra",  # Luya
    "0106": "sierra",  # Rodríguez de Mendoza
    "0107": "selva",  # Utcubamba
    # Áncash
    "0201": "sierra",  # Huaraz
    "0202": "sierra",
    "0203": "sierra",
    "0204": "sierra",
    "0205": "sierra",
    "0206": "sierra",
    "0207": "selva",  # Carlos F. Fitzcarrald (ceja de selva)
    "0208": "costa",  # Casma
    "0209": "sierra",
    "0210": "sierra",
    "0211": "costa",  # Huarmey
    "0212": "sierra",
    "0213": "sierra",
    "0214": "sierra",
    "0215": "sierra",
    "0216": "sierra",
    "0217": "sierra",
    "0218": "costa",  # Santa (Chimbote)
    "0219": "sierra",
    "0220": "sierra",
    # Arequipa
    "0401": "sierra",
    "0402": "costa",  # Camaná
    "0403": "sierra",
    "0404": "sierra",
    "0405": "sierra",
    "0406": "sierra",
    "0407": "costa",  # Islay
    "0408": "sierra",
    # Cusco
    "0801": "sierra",
    "0802": "sierra",
    "0803": "sierra",
    "0804": "sierra",
    "0805": "sierra",
    "0806": "sierra",
    "0807": "sierra",
    "0808": "sierra",
    "0809": "selva",  # La Convención
    "0810": "sierra",
    "0811": "selva",  # Paucartambo (ceja de selva)
    "0812": "sierra",
    "0813": "sierra",
    # Huánuco
    "1001": "sierra",
    "1002": "sierra",
    "1003": "sierra",
    "1004": "selva",
    "1005": "sierra",
    "1006": "selva",  # Leoncio Prado (Tingo María)
    "1007": "selva",
    "1008": "selva",
    "1009": "selva",
    "1010": "sierra",
    "1011": "sierra",
    # Junín
    "1201": "sierra",
    "1202": "sierra",
    "1203": "selva",  # Chanchamayo
    "1204": "sierra",
    "1205": "sierra",
    "1206": "selva",  # Satipo
    "1207": "sierra",
    "1208": "sierra",
    "1209": "sierra",
    # La Libertad
    "1301": "costa",  # Trujillo
    "1302": "costa",
    "1303": "selva",  # Bolívar (ceja)
    "1304": "costa",
    "1305": "sierra",
    "1306": "sierra",
    "1307": "costa",
    "1308": "selva",  # Pataz
    "1309": "sierra",
    "1310": "sierra",
    "1311": "costa",
    "1312": "costa",
    # Lima
    "1501": "costa",
    "1502": "costa",
    "1503": "sierra",
    "1504": "sierra",
    "1505": "costa",
    "1506": "costa",
    "1507": "sierra",
    "1508": "costa",
    "1509": "sierra",
    "1510": "sierra",
    # Moquegua
    "1801": "costa",
    "1802": "sierra",
    "1803": "costa",
    # Pasco
    "1901": "sierra",
    "1902": "sierra",
    "1903": "selva",  # Oxapampa
    # Piura
    "2001": "costa",
    "2002": "sierra",
    "2003": "sierra",
    "2004": "sierra",
    "2005": "costa",
    "2006": "costa",
    "2007": "costa",
    "2008": "costa",
    # Tacna
    "2301": "costa",
    "2302": "sierra",
    "2303": "costa",
    "2304": "sierra",
}


@lru_cache(maxsize=1)
def _build_province_map() -> dict[str, Zona]:
    mapping = dict(_PROVINCE_ZONA)
    for depto in list_departamentos():
        default = _DEPT_DEFAULT.get(depto["codigo"])
        if not default:
            continue
        for prov in list_provincias(depto["nombre"]):
            mapping.setdefault(prov["codigo"], default)
    return mapping


def get_provincia_zona(provincia_codigo: str) -> Zona | None:
    code = (provincia_codigo or "").strip()
    if len(code) == 4 and code.isdigit():
        return _build_province_map().get(code)
    return None


def get_provincia_zona_for_item(prov: dict) -> Zona:
    zona = get_provincia_zona(prov.get("codigo", ""))
    if zona:
        return zona
    depto_code = prov.get("departamento_codigo", "")
    return _DEPT_DEFAULT.get(depto_code, "sierra")


def enrich_provincia(prov: dict) -> dict:
    return {**prov, "zona_natural": get_provincia_zona_for_item(prov)}


def enrich_distrito(dist: dict, provincia_zona: Zona | None = None) -> dict:
    zona = provincia_zona or get_provincia_zona(dist.get("provincia_codigo", ""))
    return {**dist, "zona_natural": zona or "sierra"}


def group_by_zona(items: list[dict]) -> list[dict]:
    """Agrupa ítems con campo zona_natural en bloques ordenados costa → sierra → selva."""
    buckets: dict[str, list[dict]] = {z: [] for z in ZONA_ORDER}
    for item in items:
        z = item.get("zona_natural") or "sierra"
        if z not in buckets:
            buckets[z] = []
        buckets[z].append(item)
    groups = []
    for z in ZONA_ORDER:
        if buckets.get(z):
            groups.append(
                {
                    "zona": z,
                    "label": ZONA_LABELS.get(z, z.title()),
                    "items": buckets[z],
                }
            )
    return groups


def provincias_by_zona(departamento: str) -> dict[str, list[dict]]:
    provs = [enrich_provincia(p) for p in list_provincias(departamento)]
    result: dict[str, list[dict]] = {z: [] for z in ZONA_ORDER}
    for p in provs:
        z = p["zona_natural"]
        result.setdefault(z, []).append(p)
    return result


def distrito_nombres_zona_departamento(zona: str, departamento: str) -> list[str]:
    from .ubigeo_loader import list_distritos

    names: list[str] = []
    z = (zona or "").lower().strip()
    for prov in list_provincias(departamento):
        if get_provincia_zona_for_item(prov) != z:
            continue
        for dist in list_distritos(prov["nombre"], departamento):
            names.append(dist["nombre"])
    return sorted(set(names))
