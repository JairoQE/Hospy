"""Carga UBIGEO Perú (departamentos, provincias y distritos) desde JSON local."""

from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data" / "ubigeo"


def _norm(value: str) -> str:
    text = (value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


# Alias de nombres mal escritos (legacy) → nombre oficial en JSON
_SEARCH_ALIASES: dict[str, str] = {
    "maraqon": "marañón",
    "maranon": "marañón",
    "ferreqafe": "ferreñafe",
    "ferrenafe": "ferreñafe",
    "bongara": "bongará",
    "huamalies": "huamalíes",
    "apurimac": "apurímac",
    "huanuco": "huánuco",
    "junin": "junín",
    "san martin": "san martín",
    "nepeqa": "nepeña",
    "ocoqa": "ocoña",
    "uqon": "uñón",
    "unon": "uñón",
    "baqos": "baños",
    "los baqos del inca": "los baños del inca",
    "puqos": "puños",
    "zuqiga": "zuñiga",
    "viqac": "viñac",
    "iqapari": "iñapari",
    "nuqoa": "nuñoa",
}


def _resolve_alias(value: str) -> str:
    key = _norm(value)
    return _SEARCH_ALIASES.get(key, value)


@lru_cache(maxsize=1)
def _indexes() -> dict:
    with (DATA_DIR / "departamentos.json").open(encoding="utf-8") as f:
        departamentos_raw = json.load(f)
    with (DATA_DIR / "provincias.json").open(encoding="utf-8") as f:
        provincias_by_depto = json.load(f)
    with (DATA_DIR / "distritos.json").open(encoding="utf-8") as f:
        distritos_by_prov = json.load(f)

    depto_by_id: dict[str, dict] = {}
    depto_by_codigo: dict[str, dict] = {}
    depto_by_name: dict[str, dict] = {}

    for row in departamentos_raw:
        codigo = row["codigo_ubigeo"].zfill(2)
        item = {
            "id": row["id_ubigeo"],
            "codigo": codigo,
            "nombre": row["nombre_ubigeo"],
        }
        depto_by_id[row["id_ubigeo"]] = item
        depto_by_codigo[codigo] = item
        depto_by_name[_norm(row["nombre_ubigeo"])] = item

    prov_by_id: dict[str, dict] = {}
    prov_by_codigo: dict[str, dict] = {}
    prov_by_name_depto: dict[tuple[str, str], dict] = {}
    provs_by_depto_id: dict[str, list[dict]] = {}

    for depto_id, provincias in provincias_by_depto.items():
        depto = depto_by_id.get(depto_id)
        if not depto:
            continue
        dep_code = depto["codigo"]
        listed: list[dict] = []
        for row in provincias:
            codigo_full = dep_code + row["codigo_ubigeo"].zfill(2)
            item = {
                "id": row["id_ubigeo"],
                "codigo": codigo_full,
                "nombre": row["nombre_ubigeo"],
                "departamento_id": depto_id,
                "departamento_codigo": dep_code,
                "departamento_nombre": depto["nombre"],
            }
            prov_by_id[row["id_ubigeo"]] = item
            prov_by_codigo[codigo_full] = item
            prov_by_name_depto[(_norm(depto["nombre"]), _norm(row["nombre_ubigeo"]))] = item
            listed.append(item)
        provs_by_depto_id[depto_id] = sorted(listed, key=lambda x: x["nombre"])

    distritos_by_prov_id: dict[str, list[dict]] = {}
    distritos_nombres_by_depto_codigo: dict[str, list[str]] = {}
    distritos_nombres_by_prov_codigo: dict[str, list[str]] = {}

    for prov_id, distritos in distritos_by_prov.items():
        prov = prov_by_id.get(prov_id)
        if not prov:
            continue
        dep_code = prov["departamento_codigo"]
        prov_code = prov["codigo"]
        listed_dist: list[dict] = []
        names: list[str] = []
        for row in distritos:
            codigo_full = prov_code + row["codigo_ubigeo"].zfill(2)
            nombre = row["nombre_ubigeo"]
            item = {
                "id": row["id_ubigeo"],
                "codigo": codigo_full,
                "nombre": nombre,
                "provincia_id": prov_id,
                "provincia_codigo": prov_code,
                "provincia_nombre": prov["nombre"],
                "departamento_codigo": dep_code,
                "departamento_nombre": prov["departamento_nombre"],
            }
            listed_dist.append(item)
            names.append(nombre)
        listed_dist.sort(key=lambda x: x["nombre"])
        distritos_by_prov_id[prov_id] = listed_dist
        distritos_nombres_by_prov_codigo[prov_code] = names
        distritos_nombres_by_depto_codigo.setdefault(dep_code, []).extend(names)

    for dep_code in distritos_nombres_by_depto_codigo:
        distritos_nombres_by_depto_codigo[dep_code] = sorted(
            set(distritos_nombres_by_depto_codigo[dep_code])
        )

    idx = {
        "departamentos": sorted(depto_by_id.values(), key=lambda x: x["nombre"]),
        "depto_by_id": depto_by_id,
        "depto_by_codigo": depto_by_codigo,
        "depto_by_name": depto_by_name,
        "provs_by_depto_id": provs_by_depto_id,
        "prov_by_id": prov_by_id,
        "prov_by_codigo": prov_by_codigo,
        "prov_by_name_depto": prov_by_name_depto,
        "distritos_by_prov_id": distritos_by_prov_id,
        "distritos_nombres_by_depto_codigo": distritos_nombres_by_depto_codigo,
        "distritos_nombres_by_prov_codigo": distritos_nombres_by_prov_codigo,
    }
    _apply_callao_patch(idx)
    return idx


def _apply_callao_patch(idx: dict) -> None:
    """INEI: Callao (07) es departamento propio; en el JSON legacy está bajo Lima."""
    if "07" in idx["depto_by_codigo"]:
        return

    callao_prov_id = "3285"
    lima_depto_id = "3926"
    callao_prov = idx["prov_by_id"].get(callao_prov_id)
    if not callao_prov:
        return

    callao_depto = {"id": "0701", "codigo": "07", "nombre": "Callao"}

    lima_provs = idx["provs_by_depto_id"].get(lima_depto_id, [])
    idx["provs_by_depto_id"][lima_depto_id] = [
        p for p in lima_provs if p["id"] != callao_prov_id
    ]

    old_prov_code = callao_prov["codigo"]
    new_prov_code = "0701"
    callao_prov = {
        **callao_prov,
        "codigo": new_prov_code,
        "departamento_id": callao_depto["id"],
        "departamento_codigo": "07",
        "departamento_nombre": "Callao",
    }
    idx["prov_by_id"][callao_prov_id] = callao_prov
    idx["prov_by_codigo"][new_prov_code] = callao_prov
    if idx["prov_by_codigo"].get(old_prov_code, {}).get("id") == callao_prov_id:
        idx["prov_by_codigo"].pop(old_prov_code, None)
    for prov_list in idx["provs_by_depto_id"].values():
        for prov in prov_list:
            idx["prov_by_codigo"][prov["codigo"]] = prov
    idx["prov_by_name_depto"][(_norm("Callao"), _norm("Callao"))] = callao_prov
    idx["provs_by_depto_id"][callao_depto["id"]] = [callao_prov]

    idx["depto_by_id"][callao_depto["id"]] = callao_depto
    idx["depto_by_codigo"]["07"] = callao_depto
    idx["depto_by_name"]["callao"] = callao_depto
    idx["departamentos"] = sorted(
        idx["departamentos"] + [callao_depto], key=lambda x: x["nombre"]
    )

    callao_dist_names = idx["distritos_nombres_by_prov_codigo"].pop(old_prov_code, [])
    idx["distritos_nombres_by_prov_codigo"][new_prov_code] = callao_dist_names
    idx["distritos_nombres_by_depto_codigo"]["07"] = list(callao_dist_names)

    lima_names = idx["distritos_nombres_by_depto_codigo"].get("15", [])
    if callao_dist_names:
        idx["distritos_nombres_by_depto_codigo"]["15"] = sorted(
            set(lima_names) - set(callao_dist_names)
        )

    for dist in idx["distritos_by_prov_id"].get(callao_prov_id, []):
        dist["departamento_codigo"] = "07"
        dist["departamento_nombre"] = "Callao"
        dist["provincia_codigo"] = new_prov_code


def list_departamentos() -> list[dict]:
    return _indexes()["departamentos"]


def resolve_departamento(value: str) -> dict | None:
    key = _resolve_alias((value or "").strip())
    if not key:
        return None
    idx = _indexes()
    if key.isdigit():
        return idx["depto_by_codigo"].get(key.zfill(2))
    norm = _norm(key)
    return idx["depto_by_name"].get(norm)


def list_provincias(departamento: str) -> list[dict]:
    depto = resolve_departamento(departamento)
    if not depto:
        return []
    return _indexes()["provs_by_depto_id"].get(depto["id"], [])


def resolve_provincia(value: str, departamento: str | None = None) -> dict | None:
    key = _resolve_alias((value or "").strip())
    if departamento:
        departamento = _resolve_alias(departamento)
    if not key:
        return None
    idx = _indexes()
    if len(key) == 4 and key.isdigit():
        return idx["prov_by_codigo"].get(key)
    if departamento:
        depto = resolve_departamento(departamento)
        if depto:
            found = idx["prov_by_name_depto"].get((_norm(depto["nombre"]), _norm(key)))
            if found:
                return found
    for prov in idx["prov_by_codigo"].values():
        if _norm(prov["nombre"]) == _norm(key):
            if departamento:
                depto = resolve_departamento(departamento)
                if depto and prov["departamento_codigo"] != depto["codigo"]:
                    continue
            return prov
    return None


def list_distritos(provincia: str, departamento: str | None = None) -> list[dict]:
    prov = resolve_provincia(provincia, departamento)
    if not prov:
        return []
    return _indexes()["distritos_by_prov_id"].get(prov["id"], [])


def list_distritos_departamento(departamento: str) -> list[dict]:
    """Todos los distritos del departamento (todas las provincias), ordenados."""
    if not resolve_departamento(departamento):
        return []
    rows: list[dict] = []
    for prov in list_provincias(departamento):
        rows.extend(list_distritos(prov["nombre"], departamento))
    rows.sort(
        key=lambda d: (
            (d.get("provincia_nombre") or "").casefold(),
            (d.get("nombre") or "").casefold(),
        )
    )
    return rows


def distrito_nombres_departamento(departamento: str) -> list[str]:
    names: list[str] = []
    for prov in list_provincias(departamento):
        names.extend(distrito_nombres_provincia(prov["nombre"], departamento))
    return sorted(set(names))


def distrito_nombres_provincia(provincia: str, departamento: str | None = None) -> list[str]:
    return [d["nombre"] for d in list_distritos(provincia, departamento)]


# Destinos frecuentes en búsqueda (coinciden con hospedajes demo / campo city)
_POPULAR_NORM = frozenset(
    {
        _norm(name)
        for names in (
            [
                "Lima",
                "Miraflores",
                "Barranco",
                "San Isidro",
                "Cusco",
                "Arequipa",
                "Trujillo",
                "Piura",
                "Chiclayo",
                "Ica",
                "Huánuco",
                "Huaraz",
                "Iquitos",
                "Tarapoto",
                "Pucallpa",
                "Puerto Maldonado",
                "Puno",
                "Tacna",
                "Tingo María",
                "Rupa Rupa",
                "Cerro de Pasco",
            ]
        )
        for name in names
    }
)


@lru_cache(maxsize=1)
def _flat_places() -> tuple[dict, ...]:
    idx = _indexes()
    places: list[dict] = []

    for depto in idx["departamentos"]:
        nombre = depto["nombre"]
        places.append(
            {
                "tipo": "departamento",
                "nombre": nombre,
                "subtitle": "Perú",
                "ciudad": nombre,
                "departamento": nombre,
                "provincia": None,
                "distrito": None,
                "_norm": _norm(nombre),
            }
        )

    for prov_list in idx["provs_by_depto_id"].values():
        for prov in prov_list:
            nombre = prov["nombre"]
            depto = prov["departamento_nombre"]
            places.append(
                {
                    "tipo": "provincia",
                    "nombre": nombre,
                    "subtitle": f"{depto}, Perú",
                    "ciudad": nombre,
                    "departamento": depto,
                    "provincia": nombre,
                    "distrito": None,
                    "_norm": _norm(nombre),
                }
            )

    for dist_list in idx["distritos_by_prov_id"].values():
        for dist in dist_list:
            nombre = dist["nombre"]
            depto = dist["departamento_nombre"]
            places.append(
                {
                    "tipo": "distrito",
                    "nombre": nombre,
                    "subtitle": f"{depto}, Perú",
                    "ciudad": nombre,
                    "departamento": depto,
                    "provincia": dist["provincia_nombre"],
                    "distrito": nombre,
                    "_norm": _norm(nombre),
                }
            )

    # Ciudades capitales representativas que no están como "distrito" en UBIGEO,
    # pero se usan en el campo `city` en Hospy.
    # Ej: "Tingo María" (capital de Leoncio Prado) suele corresponder al distrito "Rupa Rupa".
    places.append(
        {
            "tipo": "distrito",
            "nombre": "Tingo María",
            "subtitle": "Huánuco, Perú",
            "ciudad": "Rupa Rupa",
            "departamento": "Huánuco",
            "provincia": "Leoncio Prado",
            "distrito": "Rupa Rupa",
            "_norm": _norm("Tingo María"),
        }
    )

    return tuple(places)


_TIPO_RANK = {"departamento": 3, "provincia": 2, "distrito": 1}


def _place_score(norm_name: str, query: str) -> int:
    if not query:
        return -1
    if norm_name == query:
        return 1000
    if norm_name.startswith(query):
        score = 700
    else:
        words = norm_name.split()
        if any(w.startswith(query) for w in words):
            score = 350
        elif query in norm_name and len(norm_name) <= len(query) + 8:
            score = 180
        else:
            return -1
    if norm_name in _POPULAR_NORM:
        score += 80
    return score


def search_places(query: str, limit: int = 8) -> list[dict]:
    """Sugerencias de destino para autocompletado (departamento, provincia, distrito)."""
    raw = _resolve_alias((query or "").strip())
    q = _norm(raw)
    if len(q) < 2:
        return []

    best_by_name: dict[str, tuple[int, int, dict]] = {}

    for place in _flat_places():
        norm_name = place["_norm"]
        score = _place_score(norm_name, q)
        if score < 0:
            continue
        tipo_rank = _TIPO_RANK.get(place["tipo"], 0)
        prev = best_by_name.get(norm_name)
        if prev is None or (score, tipo_rank) > (prev[0], prev[1]):
            best_by_name[norm_name] = (score, tipo_rank, place)

    scored = sorted(
        best_by_name.values(),
        key=lambda x: (
            -x[0],
            -x[1],
            len((x[2]["nombre"] or "").strip()),
            x[2]["nombre"],
        ),
    )
    out: list[dict] = []
    for _, _, place in scored[: max(1, min(limit, 20))]:
        item = {k: v for k, v in place.items() if k != "_norm"}
        out.append(item)
    return out
