from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .browse_views import BrowseTileViewSet, HomeInicioBootstrapView
from .ubigeo_views import (
    UbigeoBuscarView,
    UbigeoDepartamentosView,
    UbigeoDistritosView,
    UbigeoProvinciasView,
)

router = DefaultRouter()
router.register("hospedajes", views.AccommodationViewSet, basename="hospedaje")
router.register("servicios", views.ServiceViewSet, basename="servicio")
router.register("inicio-bloques", BrowseTileViewSet, basename="inicio-bloque")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "inicio-bootstrap/",
        HomeInicioBootstrapView.as_view(),
        name="inicio-bootstrap",
    ),
    path("ubigeo/departamentos/", UbigeoDepartamentosView.as_view(), name="ubigeo-departamentos"),
    path("ubigeo/provincias/", UbigeoProvinciasView.as_view(), name="ubigeo-provincias"),
    path("ubigeo/distritos/", UbigeoDistritosView.as_view(), name="ubigeo-distritos"),
    path("ubigeo/buscar/", UbigeoBuscarView.as_view(), name="ubigeo-buscar"),
]
