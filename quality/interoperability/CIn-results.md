# Tabla 8 — Resultados de interoperabilidad

**Fecha de verificación:** 2026-07-08  
**Entorno:** Producción GCP + Cloudflare Pages  
**API:** `https://hospy-api-wm7v5futiq-rj.a.run.app`

## Resumen

| Métrica | A | B | X | Criterio |
|---------|---|---|---|----------|
| **CIn-1-G** Formatos intercambiables | 7 | 7 | **100 %** | Sí + Parcial |
| **CIn-2-G** Protocolos soportados | 7 | 7 | **100 %** | Sí (`/sistema/protocolos/`) |
| **CIn-3-S** Interfaces externas funcionales | 9 | 9 | **100 %** | Sí (`/sistema/interfaces/`) |

*CIn-1-G estricto (solo Sí): 6/7 ≈ 85,7 % (URL-encoded solo en salida a Turnstile).*

---

## CIn-1-G — Data formats exchangeability

| ID | Formato | ¿Intercambiable? |
|----|---------|------------------|
| F-01 | JSON | Sí |
| F-02 | JWT | Sí |
| F-03 | OpenAPI 3.0 | Sí |
| F-04 | multipart/form-data | Sí |
| F-05 | ISO 8601 en JSON | Sí |
| F-06 | WebP/JPEG/PNG | Sí |
| F-07 | URL-encoded | Parcial |

**Verificación en producción:**
- `GET /api/schema/` → **200** (~222 KB)
- `GET /api/v1/integracion/hospedajes/` con API key → **200**

### Redacción informe

> Se especificaron 7 formatos de datos para el intercambio con otros sistemas (JSON, JWT, OpenAPI 3.0, multipart, ISO 8601, imágenes en CDN y URL-encoded hacia Turnstile). Los 7 son intercambiables o parcialmente intercambiables en producción. **CIn-1-G = 7/7 = 100 %**.

---

## CIn-2-G — Data exchange protocol sufficiency

| ID | Protocolo | ¿Soportado? |
|----|-----------|-------------|
| P-01 | HTTPS/TLS | Sí |
| P-02 | HTTP REST | Sí |
| P-03 | OAuth 2.0 / OIDC (Google) | Sí |
| P-04 | Facebook Graph API | Sí |
| P-05 | JWT Bearer | Sí |
| P-06 | API Key (integración) | Sí |
| P-07 | PostgreSQL (Supabase) | Sí |

### Redacción informe

> Los 7 protocolos de intercambio definidos para Hospy (TLS, REST, OAuth Google/Facebook, JWT, API Key de integración y PostgreSQL vía Supabase) están implementados y activos en el despliegue de producción. **CIn-2-G = 7/7 = 100 %**.

---

## CIn-3-S — External interface adequacy

| ID | Interface | ¿Funcional? |
|----|-----------|-------------|
| IF-01 | Frontend React ↔ API | Sí |
| IF-02 | API integración SIST | Sí |
| IF-03 | Google OAuth | Sí |
| IF-04 | Facebook Login | Sí |
| IF-05 | Cloudinary | Sí |
| IF-06 | Supabase | Sí |
| IF-07 | ip.guide | Sí |
| IF-08 | Gemini (Hospix) | Sí |
| IF-09 | Cloudflare Turnstile | Sí |

**Alcance:** no se incluyen pasarelas de pago aún incompletas.

**Verificación en producción:**
- `GET /health/` → 200
- `GET /api/v1/geo/sugerencias/` → 200
- `GET /api/v1/integracion/hospedajes/` + `X-Hospy-Integration-Key` → 200

### Redacción informe

> Se identificaron 9 interfaces externas críticas (cliente web, API de integración, autenticación social, multimedia, base de datos, geolocalización, asistente Hospix y captcha). Las nueve se encuentran configuradas en Cloud Run y responden correctamente en las pruebas realizadas. **CIn-3-S = 9/9 = 100 %**.

---

## Evidencia

- CSVs en esta carpeta
- Postman: `postman/Hospy-Interoperability.postman_collection.json`
- Capturas: `evidence-checklist-cin.txt`
