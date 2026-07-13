# CIn-3-S — Resultado

**Estado:** Completado  
**Fecha:** 2026-07-08  
**X = A/B = 9/9 = 100 %**

## Fuente canónica (producción)

```
GET https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1/sistema/interfaces/
→ HTTP 200 OK
```

| Campo | Valor |
|-------|--------|
| metric | CIn-3-S |
| A | **9** (`functional: true`) |
| B | **9** (interfaces especificadas) |
| X | **1.0** |
| X_percent | **100.0** |

Evidencia: `evidence/cin3-01-interfaces-catalog.png`

## Tabla

| ID | Interface | ¿Funcional? |
|----|-----------|-------------|
| IF-01 | SPA React ↔ API | Sí |
| IF-02 | API integración SIST | Sí |
| IF-03 | Google OAuth | Sí |
| IF-04 | Facebook Login | Sí |
| IF-05 | Cloudinary | Sí |
| IF-06 | Supabase | Sí |
| IF-07 | ip.guide | Sí |
| IF-08 | Gemini / Hospix | Sí |
| IF-09 | Turnstile | Sí |

## Redacción informe

> Para la métrica **CIn-3-S (adecuación de interfaces externas)** se identificaron **9 interfaces** especificadas entre Hospy y otros sistemas (frontend React, API SIST, Google, Facebook, Cloudinary, Supabase, ip.guide, Gemini y Turnstile). El inventario (**B = 9**) y el estado funcional (**A = 9**) se obtuvieron del endpoint de documentación **`GET /api/v1/sistema/interfaces/`** en producción, donde cada interfaz aparece con `specified: true` y `functional: true`. Por tanto **CIn-3-S = A/B = 9/9 = 100 %**. No se incluyen pasarelas de pago incompletas en el alcance.
