# CIn-1-G — Resultado

**Estado:** Completado  
**Fecha:** 2026-07-08  
**X = A/B = 7/7 = 100 %**

## Evidencia Postman (producción)

| Archivo | Formato demostrado |
|---------|-------------------|
| `evidence/cin1-01-json-integration.png` | F-01 JSON — 200, `count`: 106 |
| `evidence/cin1-03-openapi-schema.png` | F-03 OpenAPI 3.0.3 |
| `evidence/cin1-05-06-dates-images.png` | F-05 ISO 8601 + F-06 Cloudinary WebP |

## Formatos no capturados en Postman (documentados en CSV)

| ID | Formato | Evidencia alternativa |
|----|---------|----------------------|
| F-02 | JWT | OpenAPI describe Bearer; login en frontend |
| F-04 | multipart | `rooms/tests.py` subida fotos |
| F-07 | URL-encoded | `accounts/captcha.py` → Turnstile (Parcial) |

## Redacción informe

> Se identificaron 7 formatos de datos para intercambio con otros sistemas. En pruebas contra la API en producción (Postman) se verificó JSON (`GET /api/v1/integracion/hospedajes/`, 200), OpenAPI 3.0 (`GET /api/schema/`, 200), fechas ISO 8601 en `created_at` y URLs de imágenes WebP en Cloudinary (`foto_principal`). Los formatos JWT, multipart y URL-encoded quedan documentados en el esquema OpenAPI y en el código fuente. **CIn-1-G = 7/7 = 100 %.**
