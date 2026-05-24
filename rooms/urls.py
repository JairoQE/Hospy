from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("habitaciones", views.RoomViewSet, basename="habitacion")

urlpatterns = [
    path(
        "hospedajes/<int:hospedaje_pk>/habitaciones/",
        views.RoomViewSet.as_view({"get": "list", "post": "create"}),
        name="hospedaje-habitaciones",
    ),
    path(
        "hospedajes/<int:hospedaje_pk>/habitaciones/<int:pk>/",
        views.RoomViewSet.as_view({"get": "retrieve"}),
        name="hospedaje-habitacion-detalle",
    ),
    path("", include(router.urls)),
]
