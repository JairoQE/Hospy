# Integración externa — clientes registrados + API Key

Hospy permite que **otros sistemas** consulten el catálogo mediante REST + API Key,
con **registro por interfaz gráfica**, aprobación admin, auditoría y monitoreo.

## Flujo (UI)

1. El usuario entra a **Perfil** → sección **API de integración**.
2. Completa nombre del sistema / organización y envía la solicitud (**pendiente**).
3. Un administrador en **Admin → Integración** aprueba o rechaza.
4. El solicitante vuelve al perfil → **Generar API Key** (se muestra **una sola vez**).
5. Usa el header:

```http
X-Hospy-Integration-Key: hspy_xxxxxxxx...
```

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
