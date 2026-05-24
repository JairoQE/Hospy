from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccommodationInquiryView,
    ConversationViewSet,
    MessageReportAdminViewSet,
    MessageReportView,
)

router = DefaultRouter()
router.register("conversaciones", ConversationViewSet, basename="conversacion")
router.register(
    "mensajes-reportados",
    MessageReportAdminViewSet,
    basename="mensaje-reportado",
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "hospedajes/<int:pk>/consulta/",
        AccommodationInquiryView.as_view(),
        name="hospedaje-consulta",
    ),
    path(
        "mensajes/<int:pk>/reportar/",
        MessageReportView.as_view(),
        name="mensaje-reportar",
    ),
]
