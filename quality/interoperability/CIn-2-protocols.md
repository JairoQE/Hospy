# CIn-2-G — Suficiencia de protocolos de intercambio

**Tabla 8 — Interoperabilidad (ISO/IEC 25024)**

**Pregunta:** ¿Qué proporción de los protocolos de intercambio de datos **especificados** está **soportada**?

**Fórmula:** **X = A / B**

| Variable | Significado |
|----------|-------------|
| **B** | Protocolos que Hospy **debe** soportar para interoperar |
| **A** | Protocolos **implementados y operativos** en producción |
| **X** | Proporción soportada |

---

## Paso 1 — Inventario (B = 7)

**Fuente canónica en el backend:**

```
GET /api/v1/sistema/protocolos/
```

Devuelve los 7 protocolos especificados (`B`), el conteo soportado en el entorno (`A`) y `X = A/B`. Complementa el CSV `CIn-2-protocols.csv`.

Archivo CSV: `CIn-2-protocols.csv`

| ID | Protocolo | ¿Dónde en Hospy? |
|----|-----------|------------------|
| P-01 | **HTTPS/TLS** | Toda comunicación pública (API + frontend) |
| P-02 | **HTTP REST** | API `/api/v1/` (GET, POST, PATCH, DELETE) |
| P-03 | **OAuth 2.0 / OIDC** | Login con Google |
| P-04 | **Facebook Graph API** | Login con Facebook |
| P-05 | **JWT Bearer** | Autenticación del SPA y clientes API |
| P-06 | **API Key (header)** | Integración SIST (`X-Hospy-Integration-Key`) |
| P-07 | **PostgreSQL** | Persistencia vía Supabase |

---

## Paso 2 — Verificar en Postman (misma colección CIn-1)

Environment **Hospy GCP** ya configurado.

### Request A — **Health** (P-01, P-02, P-07)

**CIn — Health** → Send

- URL empieza con **`https://`** → **P-01 HTTPS**
- Método **GET** con respuesta JSON → **P-02 REST**
- Body: `"database": {"status": "ok"}` → **P-07 PostgreSQL** activo

**Captura:** `evidence/cin2-01-health-https-db.png`

---

### Request B — **Integración hospedajes** (P-01, P-02, P-06)

**CIn — Integración hospedajes** → pestaña **Headers**

Debe verse:
- `X-Hospy-Integration-Key: dev-integration-key-local`
- Respuesta **200** por **HTTPS**

→ **P-06 API Key** + refuerzo P-01 y P-02

**Captura:** `evidence/cin2-02-api-key-header.png` (Headers + 200)

*(Si ya tienes captura de integración 200, sirve; añade una con la pestaña Headers visible.)*

---

### Request C — **OpenAPI schema** (P-02, P-03, P-04, P-05)

**CIn — OpenAPI schema** → en el body busca (Ctrl+F):

| Buscar | Protocolo |
|--------|-----------|
| `/api/v1/auth/google/` | **P-03 OAuth Google** |
| `/api/v1/auth/facebook/` | **P-04 Facebook Graph** |
| `Bearer` o `JWT` | **P-05 JWT Bearer** |
| `get:`, `post:`, `patch:` | **P-02 REST** (métodos) |

**Captura:** `evidence/cin2-03-openapi-protocols.png`

---

### Evidencia complementaria (consola, opcional)

**GCP Cloud Run** → Variables de entorno:

- `GOOGLE_OAUTH_CLIENT_ID`
- `FACEBOOK_APP_ID`
- `POSTGRES_HOST` (pooler Supabase)

**Captura:** `evidence/cin2-04-cloud-run-protocols-env.png`

---

## Paso 3 — Calcular

| A | B | **CIn-2-G** |
|---|---|-------------|
| 7 | 7 | **100 %** |

Todos los protocolos están implementados y activos en producción.

---

## Redacción para informe

> Para **CIn-2-G (suficiencia de protocolos de intercambio)** se especificaron **7 protocolos**: HTTPS/TLS, HTTP REST, OAuth 2.0 con Google, Facebook Graph API, autenticación JWT Bearer, API Key en header para integración externa y PostgreSQL mediante Supabase. La verificación se realizó en el entorno de producción con Postman (solicitudes HTTPS a `/health/` y `/api/v1/integracion/hospedajes/`, confirmando REST y API Key) y revisión del esquema OpenAPI (endpoints de autenticación social y JWT). El endpoint `/health/` reportó base de datos operativa. Los siete protocolos se encuentran soportados, por lo que **A = 7**, **B = 7** y **CIn-2-G = 100 %**.

---

## Siguiente

**CIn-3-S** — Interfaces externas funcionales.
