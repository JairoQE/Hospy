"""Audita nombres UBIGEO locales contra correcciones oficiales conocidas."""
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "properties" / "data" / "ubigeo"

# Nombres que usan 'q' legítimamente (no son errores de 'ñ')
Q_LEGIT = frozenset({"Wanchaq"})


def load():
    with (BASE / "departamentos.json").open(encoding="utf-8") as f:
        deptos = json.load(f)
    with (BASE / "provincias.json").open(encoding="utf-8") as f:
        provs = json.load(f)
    with (BASE / "distritos.json").open(encoding="utf-8") as f:
        dists = json.load(f)
    return deptos, provs, dists


def suspicious_q(name: str) -> bool:
    if name in Q_LEGIT:
        return False
    return bool(re.search(r"q(?!u)", name, re.I))


def main():
    _, provs, dists = load()
    for kind, data in [("provincia", provs), ("distrito", dists)]:
        for _pid, rows in data.items():
            for r in rows:
                n = r["nombre_ubigeo"]
                if suspicious_q(n):
                    print(f"{kind}\t{n}\t{r['id_ubigeo']}")


if __name__ == "__main__":
    main()
