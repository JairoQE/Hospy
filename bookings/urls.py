from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_refund_views, views

router = DefaultRouter()
router.register("reservas", views.BookingViewSet, basename="reserva")

urlpatterns = [
    path(
        "reservas/preview/", views.BookingPreviewView.as_view(), name="reserva-preview"
    ),
    path(
        "admin/reembolsos-disputados/",
        admin_refund_views.DisputedRefundsListView.as_view(),
        name="admin-reembolsos-disputados",
    ),
    path(
        "admin/reembolsos-disputados/<int:pk>/resolver/",
        admin_refund_views.DisputedRefundResolveView.as_view(),
        name="admin-reembolso-resolver",
    ),
    path("", include(router.urls)),
]
