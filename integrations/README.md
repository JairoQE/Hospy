# Integración externa — clientes registrados + API Key

Hospy permite que **otros sistemas** consulten el catálogo mediante REST + API Key,
con **registro por interfaz gráfica**, aprobación admin, auditoría y monitoreo.

## Flujo (UI — sin aprobación admin)

1. Login → **¿Eres desarrollador? Registro API** → `/registro-desarrollador`, **o**
2. Perfil → **Activar acceso desarrollador** (instantáneo).
3. **Generar API Key** (se muestra una sola vez).
4. Consume el catálogo con `X-Hospy-Integration-Key`.

El panel Admin → Integración sirve para **monitoreo y revocación**.

## Endpoints de datos (catálogo)

Base: `/api/v1/integracion/`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/hospedajes/` | Listado |
| GET | `/hospedajes/disponibles/?entrada=&salida=` | Disponibles por fechas |
| GET | `/hospedajes/cercanos/?lat=&lng=&radio_km=` | Cercanos |
| GET | `/hospedajes/{id}/` | Detalle |

## Endpoints de gestión de clientes

| Quién | Ruta | Uso |
|-------|------|-----|
| Usuario | `GET/POST /integracion/clientes/mios/` | Listar / solicitar |
| Usuario | `POST /integracion/clientes/mios/{id}/emitir-key/` | Generar/rotar key |
| Admin | `GET /integracion/clientes/` | Listado |
| Admin | `POST /integracion/clientes/{id}/decidir/` | Aprobar/rechazar |
| Admin | `POST /integracion/clientes/{id}/revocar/` | Revocar |

Documentación OpenAPI: `/api/docs/`

## Seguridad y auditoría

- Key guardada **hasheada** (SHA-256).
- Cada uso de catálogo → `integration.api.access` + `request_count` / `last_used_at`.
- Fallback opcional: `HOSPY_INTEGRATION_API_KEY` (legacy). Preferir clientes registrados.
