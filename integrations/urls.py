from django.urls import path

from . import views

app_name = "integrations"

urlpatterns = [
    path("geo/sugerencias/", views.GeoHintsView.as_view(), name="geo-hints"),
    path(
        "geo/propietario/origen-reservas/",
        views.OwnerBookingOriginsView.as_view(),
        name="owner-booking-origins",
    ),
    path(
        "geo/admin/mapa-actividad/",
        views.AdminActivityMapView.as_view(),
        name="admin-activity-map",
    ),
    path(
        "geo/admin/alertas-seguridad/",
        views.AdminSecurityAlertsView.as_view(),
        name="admin-security-alerts",
    ),
    path(
        "geo/admin/alertas-seguridad/<int:pk>/resolver/",
        views.AdminResolveSecurityAlertView.as_view(),
        name="admin-resolve-security-alert",
    ),
    path("eventos/", views.ActifyEventsListView.as_view(), name="actify-events"),
    path(
        "eventos/<int:pk>/",
        views.ActifyEventDetailView.as_view(),
        name="actify-event-detail",
    ),
    path(
        "lugares-turisticos/",
        views.ConectaTingoDatosView.as_view(),
        name="conecta-tingo-datos",
    ),
    path(
        "lugares-turisticos/<str:slug>/",
        views.ConectaTingoPlaceDetailView.as_view(),
        name="conecta-tingo-place-detail",
    ),
    path(
        "restaurantes/",
        views.RestoPointListView.as_view(),
        name="restopoint-list",
    ),
    path(
        "restaurantes/<str:pk>/",
        views.RestoPointDetailView.as_view(),
        name="restopoint-detail",
    ),
    path(
        "alrededores/",
        views.NearbyExploreView.as_view(),
        name="nearby-explore",
    ),
]
