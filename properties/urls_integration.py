from django.urls import path

from . import views

urlpatterns = [
    path(
        "hospedajes/",
        views.IntegrationAccommodationListView.as_view(),
        name="integracion-hospedajes",
    ),
    path(
        "hospedajes/disponibles/",
        views.IntegrationAccommodationDisponiblesView.as_view(),
        name="integracion-hospedajes-disponibles",
    ),
    path(
        "hospedajes/cercanos/",
        views.IntegrationAccommodationNearbyView.as_view(),
        name="integracion-hospedajes-cercanos",
    ),
    path(
        "hospedajes/<int:pk>/",
        views.IntegrationAccommodationDetailView.as_view(),
        name="integracion-hospedaje-detalle",
    ),
]
