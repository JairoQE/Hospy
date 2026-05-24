import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "properties" / "data" / "ubigeo"
IDS = {
    "2788", "2862", "2863", "2916", "2937", "2966", "3072", "3079", "3092", "3114",
    "3149", "3152", "3276", "3354", "3392", "3509", "3564", "3591", "3609", "3680",
    "3721", "3900", "3908", "4007", "4091", "4106", "4177", "4192", "4296", "4334",
    "4393", "4319", "3574", "3906",
}

with (BASE / "departamentos.json").open(encoding="utf-8") as f:
    deptos = {d["id_ubigeo"]: d["nombre_ubigeo"] for d in json.load(f)}
with (BASE / "provincias.json").open(encoding="utf-8") as f:
    provs = json.load(f)
with (BASE / "distritos.json").open(encoding="utf-8") as f:
    dists = json.load(f)

prov_info = {}
for depto_id, rows in provs.items():
    for r in rows:
        prov_info[r["id_ubigeo"]] = (r["nombre_ubigeo"], deptos.get(depto_id, "?"))

for prov_id, rows in dists.items():
    for r in rows:
        if r["id_ubigeo"] in IDS:
            pn, dn = prov_info.get(prov_id, ("?", "?"))
            print(f"{r['nombre_ubigeo']:30} | {pn:20} | {dn}")

for depto_id, rows in provs.items():
    for r in rows:
        if r["id_ubigeo"] in IDS:
            print(f"PROV {r['nombre_ubigeo']:20} | {deptos.get(depto_id,'?')}")
