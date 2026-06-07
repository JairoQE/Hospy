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
]
