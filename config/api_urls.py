"""
Rutas API v1 — alineadas al documento de requisitos Hospy.
"""

from django.urls import include, path

from config.system_views import (
    interfaces_externas,
    protocolos_intercambio,
    sistema_index,
)
from sponsors.urls import urlpatterns_mine

urlpatterns = [
    path("sistema/", sistema_index, name="sistema-index"),
    path("sistema/protocolos/", protocolos_intercambio, name="sistema-protocolos"),
    path("sistema/interfaces/", interfaces_externas, name="sistema-interfaces"),
    path("auth/", include("accounts.urls")),
    path("", include("properties.urls")),
    path("", include("rooms.urls")),
    path("", include("bookings.urls")),
    path("", include("payments.urls")),
    path("", include("reviews.urls")),
    path("", include("notifications.urls")),
    path("", include("messaging.urls")),
    path("integracion/", include("properties.urls_integration")),
    path("hospix/", include("hospix.urls")),
    path("anuncios/", include("sponsors.urls")),
    path("mis-anuncios/", include(urlpatterns_mine)),
    path("", include("site_ui.urls")),
    path("", include("audit.urls")),
    path("", include("integrations.urls")),
    path("", include("organizations.urls")),
]
