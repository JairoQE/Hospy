"""
Catálogo de interoperabilidad (ISO/IEC 25024 — Tabla 8).

- CIn-2-G: protocolos de intercambio (B especificados, A soportados).
- CIn-3-S: interfaces externas (B especificadas, A funcionales).
"""

from __future__ import annotations

import os
from typing import Any

from django.conf import settings

from config.health import check_database

# Inventario B — protocolos que Hospy especifica soportar (CIn-2-G).
PROTOCOLS_SPEC: list[dict[str, Any]] = [
    {
        "id": "P-01",
        "name": "HTTPS/TLS 1.2+",
        "scope": "transporte",
        "standard": "TLS sobre HTTP",
        "usage": "Comunicación pública API y frontend",
        "reference_endpoints": ["/health/", "/api/v1/"],
    },
    {
        "id": "P-02",
        "name": "HTTP REST",
        "scope": "api",
        "standard": "REST sobre HTTP/HTTPS",
        "usage": "API versionada /api/v1/ (GET, POST, PATCH, DELETE)",
        "reference_endpoints": ["/api/v1/integracion/hospedajes/", "/api/schema/"],
    },
    {
        "id": "P-03",
        "name": "OAuth 2.0 / OpenID Connect",
        "scope": "autenticacion_social",
        "standard": "OAuth 2.0 / OIDC",
        "usage": "Login y registro con Google",
        "reference_endpoints": ["/api/v1/auth/google/"],
    },
    {
        "id": "P-04",
        "name": "Facebook Graph API",
        "scope": "autenticacion_social",
        "standard": "Meta Graph API",
        "usage": "Login y registro con Facebook",
        "reference_endpoints": ["/api/v1/auth/facebook/"],
    },
    {
        "id": "P-05",
        "name": "JWT Bearer",
        "scope": "autenticacion_api",
        "standard": "RFC 7519 / RFC 6750",
        "usage": "Authorization: Bearer <access_token> en clientes API",
        "reference_endpoints": [
            "/api/v1/auth/login/",
            "/api/v1/auth/token/refresh/",
            "/api/v1/auth/perfil/",
        ],
    },
    {
        "id": "P-06",
        "name": "API Key (header)",
        "scope": "integracion_externa",
        "standard": "Header personalizado",
        "usage": "Sistemas externos (SIST) con X-Hospy-Integration-Key",
        "reference_endpoints": ["/api/v1/integracion/hospedajes/"],
    },
    {
        "id": "P-07",
        "name": "PostgreSQL wire protocol",
        "scope": "persistencia",
        "standard": "PostgreSQL",
        "usage": "Base de datos gestionada (Supabase)",
        "reference_endpoints": ["/health/"],
    },
]


def _https_active(request) -> bool:
    if request is not None and request.is_secure():
        return True
    if os.environ.get("K_SERVICE"):
        return True
    return settings.DEBUG is False and not os.environ.get("DJANGO_DEBUG", "").lower() in (
        "true",
        "1",
        "yes",
    )


def _protocol_supported(protocol_id: str, request) -> bool:
    if protocol_id == "P-01":
        return _https_active(request)
    if protocol_id == "P-02":
        return True
    if protocol_id == "P-03":
        return bool(os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip())
    if protocol_id == "P-04":
        app_id = os.environ.get("FACEBOOK_APP_ID", "").strip()
        secret = os.environ.get("FACEBOOK_APP_SECRET", "").strip()
        return bool(app_id and secret)
    if protocol_id == "P-05":
        return "rest_framework_simplejwt.authentication.JWTAuthentication" in (
            settings.REST_FRAMEWORK.get("DEFAULT_AUTHENTICATION_CLASSES", ())
        )
    if protocol_id == "P-06":
        from integrations.models import IntegrationClient

        if IntegrationClient.objects.filter(
            status=IntegrationClient.Status.ACTIVE,
            key_hash__gt="",
        ).exists():
            return True
        return bool(getattr(settings, "HOSPY_INTEGRATION_API_KEY", "").strip())
    if protocol_id == "P-07":
        return check_database().get("status") == "ok"
    return False


def build_protocols_catalog(request=None) -> dict[str, Any]:
    """Construye respuesta CIn-2-G: inventario B + soporte A en el entorno actual."""
    protocols: list[dict[str, Any]] = []
    for spec in PROTOCOLS_SPEC:
        supported = _protocol_supported(spec["id"], request)
        protocols.append(
            {
                **spec,
                "specified": True,
                "supported": supported,
                "counts_as_A": supported,
            }
        )

    a = sum(1 for p in protocols if p["counts_as_A"])
    b = len(protocols)
    x = round(a / b, 4) if b else None

    return {
        "metric": "CIn-2-G",
        "name": "Data exchange protocol sufficiency",
        "name_es": "Suficiencia de protocolos de intercambio",
        "formula": "X = A / B",
        "A": a,
        "B": b,
        "X": x,
        "X_percent": round(x * 100, 2) if x is not None else None,
        "protocols": protocols,
        "related_documentation": {
            "openapi_schema": "/api/schema/",
            "swagger_ui": "/api/docs/",
            "redoc": "/api/redoc/",
            "health": "/health/",
            "interfaces_externas": "/api/v1/sistema/interfaces/",
            "quality_csv": "quality/interoperability/CIn-2-protocols.csv",
        },
    }


# Inventario B — interfaces externas especificadas (CIn-3-S).
# Fuera de alcance: pasarelas de pago incompletas.
INTERFACES_SPEC: list[dict[str, Any]] = [
    {
        "id": "IF-01",
        "name": "SPA React ↔ API REST",
        "external_system": "Frontend hospy.pages.dev",
        "usage": "Cliente principal web consume /api/v1/",
        "verification": "FRONTEND_URL y CORS hacia el SPA",
        "reference_endpoints": ["/api/v1/inicio/", "/api/v1/hospedajes/"],
    },
    {
        "id": "IF-02",
        "name": "API integración SIST",
        "external_system": "Sistemas externos / terceros",
        "usage": "Catálogo de lectura con X-Hospy-Integration-Key",
        "verification": "GET /api/v1/integracion/hospedajes/",
        "reference_endpoints": [
            "/api/v1/integracion/hospedajes/",
            "/api/v1/integracion/hospedajes/disponibles/",
            "/api/v1/integracion/hospedajes/cercanos/",
        ],
    },
    {
        "id": "IF-03",
        "name": "Login Google OAuth",
        "external_system": "Google Identity",
        "usage": "Login y registro con token de Google",
        "verification": "GOOGLE_OAUTH_CLIENT_ID configurado",
        "reference_endpoints": ["/api/v1/auth/google/"],
    },
    {
        "id": "IF-04",
        "name": "Login Facebook",
        "external_system": "Meta Graph API",
        "usage": "Login y registro con Facebook Login",
        "verification": "FACEBOOK_APP_ID y FACEBOOK_APP_SECRET",
        "reference_endpoints": ["/api/v1/auth/facebook/"],
    },
    {
        "id": "IF-05",
        "name": "Almacenamiento multimedia",
        "external_system": "Cloudinary",
        "usage": "Subida y entrega de imágenes por CDN",
        "verification": "USE_CLOUDINARY y CLOUDINARY_CLOUD_NAME",
        "reference_endpoints": ["/api/v1/integracion/hospedajes/"],
    },
    {
        "id": "IF-06",
        "name": "Base de datos",
        "external_system": "Supabase PostgreSQL",
        "usage": "Persistencia de dominio Hospy",
        "verification": "GET /health/ → database.status = ok",
        "reference_endpoints": ["/health/"],
    },
    {
        "id": "IF-07",
        "name": "Geolocalización IP",
        "external_system": "ip.guide",
        "usage": "Sugerencias de locale y señales de seguridad",
        "verification": "IP_GUIDE_ENABLED; GET /api/v1/geo/sugerencias/",
        "reference_endpoints": ["/api/v1/geo/sugerencias/"],
    },
    {
        "id": "IF-08",
        "name": "LLM asistente Hospix",
        "external_system": "Google Gemini",
        "usage": "Chat conversacional del asistente Hospix",
        "verification": "GEMINI_API_KEY configurada",
        "reference_endpoints": ["/api/v1/hospix/chat/"],
    },
    {
        "id": "IF-09",
        "name": "Captcha login",
        "external_system": "Cloudflare Turnstile",
        "usage": "Anti-bot en autenticación",
        "verification": "TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY",
        "reference_endpoints": ["/api/v1/auth/login/"],
    },
    {
        "id": "IF-10",
        "name": "Catálogo de eventos",
        "external_system": "Actify",
        "usage": "Listado y detalle de eventos públicos (proxy Hospy)",
        "verification": "ACTIFY_API_KEY; GET /api/v1/eventos/",
        "reference_endpoints": ["/api/v1/eventos/", "/api/v1/eventos/{id}/"],
    },
    {
        "id": "IF-11",
        "name": "Demanda turística / hotspots",
        "external_system": "Conecta Tingo",
        "usage": "Mapa de calor, hotspots y perfiles turísticos (proxy Hospy)",
        "verification": "CONECTA_TINGO_API_KEY; GET /api/v1/lugares-turisticos/",
        "reference_endpoints": ["/api/v1/lugares-turisticos/"],
    },
    {
        "id": "IF-12",
        "name": "Catálogo de restaurantes",
        "external_system": "RestoPoint",
        "usage": "Listado y detalle de restaurantes con lat/lng (proxy Hospy)",
        "verification": "RESTOPOINT_API_KEY; GET /api/v1/restaurantes/",
        "reference_endpoints": [
            "/api/v1/restaurantes/",
            "/api/v1/restaurantes/{id}/",
        ],
    },
]


def _env_true(name: str, default: str = "") -> bool:
    return os.environ.get(name, default).strip().lower() in ("true", "1", "yes")


def _interface_functional(interface_id: str) -> bool:
    if interface_id == "IF-01":
        frontend = os.environ.get("FRONTEND_URL", "").strip()
        cors = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
        return bool(frontend) or "hospy.pages.dev" in cors or "pages.dev" in cors
    if interface_id == "IF-02":
        from integrations.models import IntegrationClient

        if IntegrationClient.objects.filter(
            status=IntegrationClient.Status.ACTIVE,
            key_hash__gt="",
        ).exists():
            return True
        return bool(getattr(settings, "HOSPY_INTEGRATION_API_KEY", "").strip())
    if interface_id == "IF-03":
        return bool(os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip())
    if interface_id == "IF-04":
        return bool(
            os.environ.get("FACEBOOK_APP_ID", "").strip()
            and os.environ.get("FACEBOOK_APP_SECRET", "").strip()
        )
    if interface_id == "IF-05":
        use_c = _env_true("USE_CLOUDINARY") or bool(
            getattr(settings, "CLOUDINARY_STORAGE", {}).get("CLOUD_NAME")
        )
        name = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip() or (
            getattr(settings, "CLOUDINARY_STORAGE", {}) or {}
        ).get("CLOUD_NAME", "")
        return bool(use_c and name)
    if interface_id == "IF-06":
        return check_database().get("status") == "ok"
    if interface_id == "IF-07":
        return bool(getattr(settings, "IP_GUIDE_ENABLED", True))
    if interface_id == "IF-08":
        return bool(os.environ.get("GEMINI_API_KEY", "").strip())
    if interface_id == "IF-09":
        return bool(
            getattr(settings, "TURNSTILE_SITE_KEY", "").strip()
            and getattr(settings, "TURNSTILE_SECRET_KEY", "").strip()
        )
    if interface_id == "IF-10":
        return bool(getattr(settings, "ACTIFY_API_KEY", "").strip())
    if interface_id == "IF-11":
        return bool(getattr(settings, "CONECTA_TINGO_API_KEY", "").strip())
    if interface_id == "IF-12":
        return bool(getattr(settings, "RESTOPOINT_API_KEY", "").strip())
    return False


def build_interfaces_catalog(request=None) -> dict[str, Any]:
    """Construye respuesta CIn-3-S: inventario B + interfaces funcionales A."""
    del request  # disponible si en el futuro se valida por request
    interfaces: list[dict[str, Any]] = []
    for spec in INTERFACES_SPEC:
        functional = _interface_functional(spec["id"])
        interfaces.append(
            {
                **spec,
                "specified": True,
                "functional": functional,
                "counts_as_A": functional,
            }
        )

    a = sum(1 for item in interfaces if item["counts_as_A"])
    b = len(interfaces)
    x = round(a / b, 4) if b else None

    return {
        "metric": "CIn-3-S",
        "name": "External interface adequacy",
        "name_es": "Adecuación de interfaces externas",
        "formula": "X = A / B",
        "A": a,
        "B": b,
        "X": x,
        "X_percent": round(x * 100, 2) if x is not None else None,
        "scope_note": "No incluye pasarelas de pago incompletas.",
        "interfaces": interfaces,
        "related_documentation": {
            "openapi_schema": "/api/schema/",
            "swagger_ui": "/api/docs/",
            "protocolos_intercambio": "/api/v1/sistema/protocolos/",
            "health": "/health/",
            "quality_csv": "quality/interoperability/CIn-3-external-interfaces.csv",
        },
    }
