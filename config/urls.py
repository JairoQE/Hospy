from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.health import build_health_payload


@extend_schema(
    tags=["Sistema"],
    summary="Estado del servicio",
    description="Comprueba que la API responde y que la base de datos está accesible.",
    responses={
        200: {"description": "Servicio operativo"},
        503: {"description": "Base de datos u otro componente no disponible"},
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    payload = build_health_payload()
    code = (
        status.HTTP_200_OK
        if payload["status"] == "ok"
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return Response(payload, status=code)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("api/v1/", include("config.api_urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
