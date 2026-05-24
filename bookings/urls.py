from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("reservas", views.BookingViewSet, basename="reserva")

urlpatterns = [
    path(
        "reservas/preview/", views.BookingPreviewView.as_view(), name="reserva-preview"
    ),
    path("", include(router.urls)),
]
