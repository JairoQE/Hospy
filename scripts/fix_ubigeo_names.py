"""
Aplica correcciones de nombres UBIGEO (INEI) en departamentos.json, provincias.json y distritos.json.
Ejecutar: python scripts/fix_ubigeo_names.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "properties" / "data" / "ubigeo"
CORRECTIONS_FILE = DATA / "name_corrections.json"


def _norm(value: str) -> str:
    text = (value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _buscador(nombre: str, etiqueta: str) -> str:
    return _norm(f"{nombre} {etiqueta.split(',')[-1].strip() if ',' in etiqueta else ''}")


def _load_corrections() -> dict[str, dict[str, str]]:
    with CORRECTIONS_FILE.open(encoding="utf-8") as f:
        raw = json.load(f)
    merged: dict[str, str] = {}
    for section in ("departamentos", "provincias", "distritos"):
        merged.update(raw.get(section, {}))
    return raw, merged


def _apply_to_row(row: dict, corrections: dict[str, str], all_names: dict[str, str]) -> bool:
    changed = False
    old_name = row.get("nombre_ubigeo", "")
    new_name = corrections.get(old_name, old_name)
    if new_name != old_name:
        row["nombre_ubigeo"] = new_name
        changed = True

    etiqueta = row.get("etiqueta_ubigeo", "")
    if etiqueta:
        new_etiqueta = etiqueta
        for wrong, right in sorted(all_names.items(), key=lambda x: -len(x[0])):
            if wrong in new_etiqueta:
                new_etiqueta = new_etiqueta.replace(wrong, right)
        if new_etiqueta != etiqueta:
            row["etiqueta_ubigeo"] = new_etiqueta
            changed = True

    if "buscador_ubigeo" in row and row.get("etiqueta_ubigeo"):
        row["buscador_ubigeo"] = _buscador(row["nombre_ubigeo"], row["etiqueta_ubigeo"])
        changed = True

    return changed


def _fix_file(path: Path, corrections: dict[str, str], all_names: dict[str, str]) -> int:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    if isinstance(data, list):
        for row in data:
            if _apply_to_row(row, corrections, all_names):
                count += 1
    elif isinstance(data, dict):
        for _key, rows in data.items():
            for row in rows:
                if _apply_to_row(row, corrections, all_names):
                    count += 1

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    return count


def main() -> None:
    sections, merged = _load_corrections()
    all_names = {**sections["departamentos"], **sections["provincias"], **sections["distritos"]}

    total = 0
    for filename in ("departamentos.json", "provincias.json", "distritos.json"):
        n = _fix_file(DATA / filename, merged, all_names)
        print(f"{filename}: {n} registros corregidos")
        total += n

    print(f"Total: {total} correcciones aplicadas")


if __name__ == "__main__":
    main()
