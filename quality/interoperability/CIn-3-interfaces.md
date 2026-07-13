# CIn-3-S — Adecuación de interfaces externas

**Tabla 8 — Interoperabilidad (ISO/IEC 25024)**

**Pregunta:** ¿Qué proporción de las interfaces externas **especificadas** (con otro software o sistema) es **funcional**?

**Fórmula:** **X = A / B**

| Variable | Significado |
|----------|-------------|
| **B** | Interfaces externas que Hospy **especifica** tener |
| **A** | De esas, las que están **funcionales** en el entorno |
| **X** | Proporción adecuada / funcional |

---

## Paso 1 — Inventario (B = 9)

**Fuente canónica en el backend:**

```
GET /api/v1/sistema/interfaces/
```

Devuelve las 9 interfaces (`B`), cuántas están funcionales (`A`) y `X = A/B`.

CSV: `CIn-3-external-interfaces.csv`

| ID | Interface | Sistema externo |
|----|-----------|-----------------|
| IF-01 | SPA React ↔ API | Frontend `hospy.pages.dev` |
| IF-02 | API integración SIST | Terceros / SIST |
| IF-03 | Login Google OAuth | Google Identity |
| IF-04 | Login Facebook | Meta Graph API |
| IF-05 | Multimedia | Cloudinary |
| IF-06 | Base de datos | Supabase PostgreSQL |
| IF-07 | Geolocalización IP | ip.guide |
| IF-08 | Asistente Hospix | Google Gemini |
| IF-09 | Captcha | Cloudflare Turnstile |

**Fuera de alcance:** pasarelas de pago incompletas.

---

## Paso 2 — Verificar (Postman + endpoint)

### Request principal — catálogo CIn-3-S

```
GET {{base_url}}/api/v1/sistema/interfaces/
```

Esperado: `metric: CIn-3-S`, `B: 9`, cada ítem con `functional: true/false`.

**Captura:** `evidence/cin3-01-interfaces-catalog.png`

### Verificaciones funcionales (complemento)

| Request | Interfaces |
|---------|------------|
| **CIn — Health** | IF-06 DB |
| **CIn — Integración hospedajes** | IF-02 SIST |
| **CIn — Geo sugerencias** | IF-07 ip.guide |
| Frontend `hospy.pages.dev` | IF-01 SPA |
| OpenAPI `/auth/google/` y `/auth/facebook/` | IF-03, IF-04 |
| URL `res.cloudinary.com` en JSON | IF-05 |
| Variables Cloud Run (Gemini, Turnstile) | IF-08, IF-09 |

**Capturas sugeridas:**
- `cin3-02-health-db.png`
- `cin3-03-integration-200.png`
- `cin3-04-geo-sugerencias.png`

---

## Paso 3 — Calcular

| A | B | **CIn-3-S** |
|---|---|-------------|
| 9 | 9 | **100 %** |

En el JSON: `functional: true` cuenta para **A**; el total de filas es **B**.

---

## Redacción para informe

> Para **CIn-3-S (adecuación de interfaces externas)** se especificaron **9 interfaces** críticas de Hospy con otros sistemas: el frontend React, la API de integración SIST, autenticación con Google y Facebook, Cloudinary, Supabase, ip.guide, Gemini (Hospix) y Cloudflare Turnstile. El inventario (B) y el estado funcional (A) se obtuvieron del endpoint **`GET /api/v1/sistema/interfaces/`**, y se complementararon con pruebas en Postman (`/health/`, integración con API key, geo sugerencias). Las nueve interfaces resultaron funcionales. **CIn-3-S = 9/9 = 100 %**.

---

## Despliegue

Tras el deploy a Cloud Run:

```
https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1/sistema/interfaces/
```
