# Tolerancia a fallos — Tabla 17 (ISO/IEC 25024)

## Archivos

| Métrica | Archivo principal | Resultado |
|---------|-------------------|-----------|
| **RFt-1-G** Evitación de fallos | `test_failure_avoidance.py`, `fault_patterns.csv` | 22/22 (100 %) |
| **RFt-2-S** Redundancia | `redundancy-components.csv`, `RFt-2-results.md` | 5/6 (83,3 %) |
| **RFt-3-S** Notificación | `fault-notification-log.csv`, `RFt-3-results.md` | n = 0; alerta configurada |

| Archivo | Uso |
|---------|-----|
| `fault_patterns.csv` | Catálogo de patrones (B) y trazabilidad a tests |
| `test_failure_avoidance.py` | 22 tests pytest |
| `postman/` | Colección para GCP |
| `evidence/` | Capturas de consola |

## Ejecutar pytest

```bash
pytest quality/fault_tolerance/ -v
```

**RFt-1-G:** X = tests pasados / total (objetivo: 22/22).

## Postman (producción)

Importar `postman/Hospy-Fault-Tolerance.postman_collection.json` y `Hospy-GCP.postman_environment.json`.

Completar `integration_key`. Para requests con token: `access_token` desde el frontend.

## Cobertura

- Salud (`/health/` caché y DB)
- Auth y JSON malformado
- API de integración
- Reservas y autorización
- Pagos directos
- Reembolsos indirectos
