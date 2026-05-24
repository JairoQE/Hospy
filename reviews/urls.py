from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("resenas", views.ReviewViewSet, basename="resena")

urlpatterns = [
    path(
        "hospedajes/<int:hospedaje_pk>/resenas/",
        views.AccommodationReviewListView.as_view(),
        name="hospedaje-resenas",
    ),
    path("", include(router.urls)),
]
