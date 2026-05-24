from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InboxSummaryView, InboxViewSet

router = DefaultRouter()
router.register("bandeja", InboxViewSet, basename="bandeja")

urlpatterns = [
    path("bandeja/resumen/", InboxSummaryView.as_view(), name="bandeja-resumen"),
    path("", include(router.urls)),
]
