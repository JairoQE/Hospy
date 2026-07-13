# Tabla 8 — Interoperabilidad (ISO/IEC 25024)

Métricas **CIn-1-G**, **CIn-2-G** y **CIn-3-S**. Todas usan **X = A / B**.

| Métrica | Nombre | A | B |
|---------|--------|---|---|
| **CIn-1-G** | Intercambiabilidad de formatos de datos | Formatos intercambiables | Formatos especificados |
| **CIn-2-G** | Suficiencia de protocolos de intercambio | Protocolos soportados | Protocolos especificados |
| **CIn-3-S** | Adecuación de interfaces externas | Interfaces funcionales | Interfaces especificadas |

## Archivos

| Archivo | Métrica |
|---------|---------|
| `CIn-1-data-formats.csv` | Formatos (JSON, JWT, OpenAPI, …) |
| `CIn-2-protocols.csv` | Protocolos (HTTPS, REST, OAuth, …) |
| `CIn-3-external-interfaces.csv` | Interfaces con terceros |
| `CIn-results.md` | Cálculos y redacción para informe |
| `postman/` | Colección de verificación en Cloud Run |

## Cómo medir (30–60 min)

### CIn-1-G — Formatos

1. Lista en `CIn-1-data-formats.csv` los formatos que Hospy **debe** intercambiar (API, auth, docs, media).
2. Verifica cada uno: Postman/curl, OpenAPI, subida de imagen, respuesta JSON.
3. Marca **Sí / Parcial / No** y calcula **A/B**.

### CIn-2-G — Protocolos

1. Lista protocolos en `CIn-2-protocols.csv` (HTTPS, REST, JWT, OAuth, API Key, PostgreSQL).
2. Confirma en código y en producción (`https://hospy-api-wm7v5futiq-rj.a.run.app`).
3. **A/B**.

### CIn-3-S — Interfaces externas

1. Lista sistemas externos en `CIn-3-external-interfaces.csv`.
2. Prueba que respondan (Postman, frontend, variables Cloud Run).
3. **No incluir** pasarelas de pago incompletas en el alcance.
4. **A/B**.

## Herramientas

- **Postman:** importar `postman/Hospy-Interoperability.postman_collection.json` y `../fault_tolerance/postman/Hospy-GCP.postman_environment.json`
- **OpenAPI:** `GET /api/schema/`, UI en `/api/docs/`
- **Producción API:** `https://hospy-api-wm7v5futiq-rj.a.run.app`
- **Integración:** header `X-Hospy-Integration-Key` (valor en Cloud Run)

## Evidencia

Ver `evidence-checklist-cin.txt`.
