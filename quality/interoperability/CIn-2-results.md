# CIn-2-G — Resultado

**Estado:** Completado  
**Fecha:** 2026-07-08  
**X = A/B = 7/7 = 100 %**

## Fuente canónica de B (inventario)

```
GET /api/v1/sistema/protocolos/
```

Este endpoint documenta los **7 protocolos especificados** (B), calcula **A** según el entorno y devuelve **X**. Complementa el CSV y sirve como documentación del backend aparte de Swagger.

Índice: `GET /api/v1/sistema/`

## Evidencia Postman (producción)

| Archivo | Protocolos demostrados |
|---------|------------------------|
| `evidence/cin2-01-health-https-db.png` | P-01 HTTPS, P-02 REST, P-07 PostgreSQL (`database: ok`) |
| `evidence/cin2-02-rest-api-key.png` | P-01 HTTPS, P-02 REST, P-06 API Key (integración 200) |
| `evidence/cin2-03-openapi-protocols.png` | P-03 OAuth Google, P-04 Facebook, P-05 JWT (`jwtAuth`) |

## Tabla de protocolos

| ID | Protocolo | ¿Soportado? |
|----|-----------|-------------|
| P-01 | HTTPS/TLS 1.2+ | **Sí** |
| P-02 | HTTP REST | **Sí** |
| P-03 | OAuth 2.0 / OIDC (Google) | **Sí** |
| P-04 | Facebook Graph API | **Sí** |
| P-05 | JWT Bearer | **Sí** |
| P-06 | API Key header | **Sí** |
| P-07 | PostgreSQL (Supabase) | **Sí** |

## Redacción informe

> Para **CIn-2-G (suficiencia de protocolos de intercambio)** se especificaron 7 protocolos: HTTPS/TLS, HTTP REST, OAuth 2.0 con Google, Facebook Graph API, JWT Bearer, API Key en header para integración externa y PostgreSQL mediante Supabase. En Postman se verificó el health check (`/health/`, base de datos operativa), la API de integración por HTTPS con API Key (200) y el esquema OpenAPI con los endpoints `/api/v1/auth/google/`, `/api/v1/auth/facebook/` y seguridad `jwtAuth`. Los siete protocolos están soportados en producción. **CIn-2-G = 7/7 = 100 %.**
