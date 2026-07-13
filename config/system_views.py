"""Endpoints de documentación del sistema (aparte de Swagger/ReDoc)."""

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.interoperability import build_interfaces_catalog, build_protocols_catalog


@extend_schema(
    tags=["Sistema"],
    summary="Índice de documentación del backend",
    description=(
        "Enlaces a documentación operativa e interoperabilidad, complementaria a Swagger."
    ),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def sistema_index(request):
    base = request.build_absolute_uri("/").rstrip("/")
    return Response(
        {
            "service": "hospy",
            "documentation": {
                "health": f"{base}/health/",
                "openapi_schema": f"{base}/api/schema/",
                "swagger_ui": f"{base}/api/docs/",
                "redoc": f"{base}/api/redoc/",
                "protocolos_intercambio": f"{base}/api/v1/sistema/protocolos/",
                "interfaces_externas": f"{base}/api/v1/sistema/interfaces/",
            },
            "note": "Documentación de interoperabilidad ISO/IEC 25024 (Tabla 8).",
        }
    )


@extend_schema(
    tags=["Sistema"],
    summary="Protocolos de intercambio (CIn-2-G)",
    description=(
        "Inventario de protocolos de intercambio **especificados** para Hospy (B) y "
        "estado de **soporte** en el entorno actual (A). Métrica ISO/IEC 25024 CIn-2-G: "
        "X = A / B."
    ),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def protocolos_intercambio(request):
    return Response(build_protocols_catalog(request))


@extend_schema(
    tags=["Sistema"],
    summary="Interfaces externas (CIn-3-S)",
    description=(
        "Inventario de interfaces externas **especificadas** para Hospy (B) y "
        "cuáles están **funcionales** en el entorno actual (A). Métrica ISO/IEC 25024 "
        "CIn-3-S: X = A / B."
    ),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def interfaces_externas(request):
    return Response(build_interfaces_catalog(request))
