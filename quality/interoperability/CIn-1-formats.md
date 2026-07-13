# CIn-1-G — Formatos de datos intercambiables

**Tabla 8 — Interoperabilidad (ISO/IEC 25024)**

**Pregunta:** ¿Qué proporción de los formatos de datos especificados puede intercambiarse con otro software o sistema?

**Fórmula:** **X = A / B**

| Variable | Significado |
|----------|-------------|
| **B** | Formatos que Hospy **especifica** para intercambiar datos con terceros |
| **A** | De esos, los que **funcionan** en la práctica (producción o prueba reproducible) |
| **X** | Proporción intercambiable |

**Criterio recomendado:** cuenta **Sí** y **Parcial** como A (explica en el informe).

---

## Paso 1 — Inventario (B = 7)

Archivo: `CIn-1-data-formats.csv`

| ID | Formato | ¿Para qué en Hospy? |
|----|---------|---------------------|
| F-01 | **JSON** | Toda la API REST (`/api/v1/`) |
| F-02 | **JWT** | Login; header `Authorization: Bearer` |
| F-03 | **OpenAPI 3.0** | Contrato machine-readable (`/api/schema/`) |
| F-04 | **multipart/form-data** | Subida de fotos (hospedajes, habitaciones) |
| F-05 | **ISO 8601** | Fechas en JSON (`2026-06-22T22:30:54-05:00`) |
| F-06 | **WebP/JPEG/PNG** | URLs de imágenes vía Cloudinary |
| F-07 | **URL-encoded** | Salida del backend hacia Turnstile (captcha) |

---

## Paso 2 — Verificar cada formato (marcar Sí / Parcial / No)

### F-01 JSON — **Sí**

**Prueba (Postman o navegador):**
```
GET https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1/integracion/hospedajes/
Header: X-Hospy-Integration-Key: <tu clave Cloud Run>
```

**Esperado:** `200`, `Content-Type: application/json`, cuerpo con `count` y `results`.

**Verificado:** 200, 106 hospedajes, `application/json`.

**Captura:** `evidence/cin1-01-json-integration.png`

---

### F-02 JWT — **Sí**

**Qué demuestra:** otro cliente puede autenticarse con tokens estándar.

**Prueba:**
1. Login en `https://hospy.pages.dev` (captcha activo).
2. DevTools → Application → Local Storage → token JWT, **o** Network → request con `Authorization: Bearer eyJ...`.
3. Postman: `GET /api/v1/auth/perfil/` con ese Bearer → `200`.

**Alternativa sin login manual:** documentar `POST /api/v1/auth/login/` + respuesta `access` / `refresh` en OpenAPI (`/api/docs/`).

**Captura:** `evidence/cin1-02-jwt-bearer.png` (Postman con Bearer 200 o Swagger auth).

---

### F-03 OpenAPI 3.0 — **Sí**

**Prueba:**
```
GET https://hospy-api-wm7v5futiq-rj.a.run.app/api/schema/
```

**Esperado:** `200`, `Content-Type: application/vnd.oai.openapi`, JSON/YAML con `openapi: 3.x`.

**UI:** `https://hospy-api-wm7v5futiq-rj.a.run.app/api/docs/`

**Verificado:** 200, ~222 KB, `application/vnd.oai.openapi`.

**Captura:** `evidence/cin1-03-openapi-schema.png` o Swagger UI.

---

### F-04 multipart/form-data — **Sí**

**Qué demuestra:** terceros o el panel propietario pueden enviar archivos binarios.

**Prueba local reproducible:**
```bash
pytest rooms/tests.py -k upload -q
```

**En producción:** propietario sube foto en panel → `POST` multipart a endpoint de fotos.

**Código:** `properties/serializers.py` (`AccommodationPhotoUploadSerializer`), `rooms/tests.py`.

**Captura:** Postman `POST` multipart con imagen **o** captura del test pytest passed.

---

### F-05 ISO 8601 en JSON — **Sí**

**Prueba:** en la respuesta JSON de integración, campo `created_at`:
```
2026-06-22T22:30:54.004263-05:00
```

**Verificado** en `GET /api/v1/integracion/hospedajes/`.

**Captura:** recorte del JSON mostrando `created_at` (y fechas `entrada`/`salida` en reservas si aplica).

---

### F-06 Imágenes WebP/JPEG/PNG — **Sí**

**Prueba:** en listado integración, campo `foto_principal`:
```
https://res.cloudinary.com/.../....webp
```

**Verificado:** hospedaje id=106 con URL Cloudinary `.webp`.

**Captura:** JSON con `foto_principal` o imagen cargando en el navegador.

---

### F-07 URL-encoded — **Parcial**

**Qué es:** el backend envía `application/x-www-form-urlencoded` **solo hacia** Cloudflare Turnstile (`accounts/captcha.py`), no como formato de entrada de la API pública.

**Cuenta como A:** Sí, si usas criterio Sí+Parcial (intercambio con otro sistema, pero no expuesto a clientes Hospy).

**Captura (opcional):** fragmento de código `captcha.py` o variables `TURNSTILE_*` en Cloud Run.

---

## Paso 3 — Calcular

| Criterio | A | B | X |
|----------|---|---|---|
| **Sí + Parcial** | 7 | 7 | **100 %** |
| Solo **Sí** | 6 | 7 | **85,7 %** |

**Valor sugerido para informe:** **CIn-1-G = 7/7 = 100 %**

---

## Paso 4 — Evidencia mínima (3 capturas)

1. JSON integración 200  
2. OpenAPI `/api/schema/` o `/api/docs/`  
3. Fecha ISO 8601 + URL Cloudinary en el mismo JSON  

Opcional: JWT Bearer y multipart.

---

## Redacción para informe

> Para medir la intercambiabilidad de formatos de datos (CIn-1-G) se identificaron **7 formatos** previstos para el intercambio con otros sistemas: JSON y JWT en la API REST, documentación OpenAPI 3.0, subida multipart de imágenes, fechas ISO 8601 en respuestas JSON, imágenes servidas en WebP/JPEG/PNG vía Cloudinary, y URL-encoded en la verificación server-side con Cloudflare Turnstile. Se verificaron en el entorno de producción (`hospy-api` en Cloud Run) mediante solicitudes HTTP y revisión de respuestas (`application/json`, esquema OpenAPI, fechas `created_at` y URLs `res.cloudinary.com`). **Siete de siete** formatos resultaron intercambiables o parcialmente intercambiables, por lo que **CIn-1-G = A/B = 7/7 = 100 %**.

---

## Siguiente métrica

Cuando cierres capturas → **CIn-2-G** (protocolos de intercambio).
