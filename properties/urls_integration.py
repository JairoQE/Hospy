from django.urls import path

from integrations import views as integration_views

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
    # Clientes registrados (solicitud, keys, admin)
    path(
        "clientes/mios/",
        integration_views.MyIntegrationClientsView.as_view(),
        name="integracion-clientes-mios",
    ),
    path(
        "clientes/mios/<int:pk>/emitir-key/",
        integration_views.MyIntegrationClientIssueKeyView.as_view(),
        name="integracion-clientes-emitir-key",
    ),
    path(
        "clientes/",
        integration_views.AdminIntegrationClientsView.as_view(),
        name="integracion-clientes-admin",
    ),
    path(
        "clientes/<int:pk>/decidir/",
        integration_views.AdminIntegrationClientDecideView.as_view(),
        name="integracion-clientes-decidir",
    ),
    path(
        "clientes/<int:pk>/revocar/",
        integration_views.AdminIntegrationClientRevokeView.as_view(),
        name="integracion-clientes-revocar",
    ),
]
