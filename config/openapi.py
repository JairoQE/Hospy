"""
Hooks y utilidades para la documentación OpenAPI (Swagger / ReDoc).
"""

import re

# Orden y descripciones mostrados en Swagger UI / ReDoc.
OPENAPI_TAGS = [
    {
        "name": "Sistema",
        "description": "Salud del servicio y utilidades de infraestructura.",
    },
    {
        "name": "Autenticación",
        "description": "Registro, inicio de sesión, JWT, OAuth y perfil de usuario.",
    },
    {
        "name": "Hospedajes",
        "description": "CRUD de alojamientos, servicios, ofertas y catálogo público.",
    },
    {
        "name": "Habitaciones",
        "description": "Habitaciones, tarifas y disponibilidad por hospedaje.",
    },
    {
        "name": "Reservas",
        "description": "Cotización, creación y gestión del ciclo de reserva.",
    },
    {
        "name": "Pagos",
        "description": "Pasarela (Yape, tarjeta, PagoEfectivo), pago directo y webhooks.",
    },
    {
        "name": "Reseñas",
        "description": "Reseñas de huéspedes y moderación.",
    },
    {
        "name": "Mensajería",
        "description": "Consultas, conversaciones y reportes de chat.",
    },
    {
        "name": "Notificaciones",
        "description": "Bandeja de entrada y resumen de notificaciones.",
    },
    {
        "name": "UBIGEO",
        "description": "Departamentos, provincias, distritos y búsqueda de ubicación en Perú.",
    },
    {
        "name": "Sitio público",
        "description": "Bootstrap de inicio, bloques de exploración y diseño del sitio.",
    },
    {
        "name": "Panel propietario",
        "description": "Datos agregados del panel del anfitrión.",
    },
    {
        "name": "Administración",
        "description": "Moderación, usuarios, dashboard y auditoría administrativa.",
    },
    {
        "name": "Integración externa",
        "description": "API de solo lectura para sistemas externos (JWT requerido).",
    },
    {
        "name": "Hospix",
        "description": "Asistente conversacional con IA.",
    },
    {
        "name": "Patrocinadores",
        "description": "Anuncios de patrocinadores y gestión de campañas.",
    },
    {
        "name": "Geo y analítica",
        "description": "Mapas, orígenes de reserva y alertas de seguridad geográficas.",
    },
    {
        "name": "Auditoría",
        "description": "Registro de acciones, alertas y retención de logs.",
    },
]

# Reglas en orden de prioridad (la primera coincidencia gana).
_TAG_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^/health/"), "Sistema"),
    (re.compile(r"^/api/v1/auth/(admin-usuarios|propietarios|patrocinadores)"), "Administración"),
    (re.compile(r"^/api/v1/auth/"), "Autenticación"),
    (re.compile(r"^/api/v1/hospedajes/\d+/resenas/"), "Reseñas"),
    (re.compile(r"^/api/v1/hospedajes/\d+/consulta/"), "Mensajería"),
    (re.compile(r"^/api/v1/hospedajes/\d+/habitaciones/"), "Habitaciones"),
    (re.compile(r"^/api/v1/hospedajes"), "Hospedajes"),
    (re.compile(r"^/api/v1/servicios"), "Hospedajes"),
    (re.compile(r"^/api/v1/habitaciones"), "Habitaciones"),
    (re.compile(r"^/api/v1/reservas"), "Reservas"),
    (re.compile(r"^/api/v1/pagos"), "Pagos"),
    (re.compile(r"^/api/v1/resenas"), "Reseñas"),
    (re.compile(r"^/api/v1/conversaciones"), "Mensajería"),
    (re.compile(r"^/api/v1/mensajes"), "Mensajería"),
    (re.compile(r"^/api/v1/notificaciones"), "Notificaciones"),
    (re.compile(r"^/api/v1/bandeja"), "Notificaciones"),
    (re.compile(r"^/api/v1/ubigeo"), "UBIGEO"),
    (re.compile(r"^/api/v1/inicio"), "Sitio público"),
    (re.compile(r"^/api/v1/diseno"), "Sitio público"),
    (re.compile(r"^/api/v1/propietario"), "Panel propietario"),
    (re.compile(r"^/api/v1/admin/"), "Administración"),
    (re.compile(r"^/api/v1/integracion/"), "Integración externa"),
    (re.compile(r"^/api/v1/hospix"), "Hospix"),
    (re.compile(r"^/api/v1/anuncios"), "Patrocinadores"),
    (re.compile(r"^/api/v1/mis-anuncios"), "Patrocinadores"),
    (re.compile(r"^/api/v1/geo/"), "Geo y analítica"),
    (re.compile(r"^/api/v1/audit-logs"), "Auditoría"),
]


def _tag_for_path(path: str) -> str | None:
    for pattern, tag in _TAG_RULES:
        if pattern.search(path):
            return tag
    return None


def assign_operation_tags(result: dict, **kwargs) -> dict:
    """Agrupa operaciones por módulo funcional en Swagger / ReDoc."""
    for path, path_item in result.get("paths", {}).items():
        for method, operation in path_item.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue
            tag = _tag_for_path(path)
            if tag:
                operation["tags"] = [tag]
    return result
