"""
Rutas API v1 — alineadas al documento de requisitos Hospy.
"""

from django.urls import include, path

from sponsors.urls import urlpatterns_mine

urlpatterns = [
    path("auth/", include("accounts.urls")),
    path("", include("properties.urls")),
    path("", include("rooms.urls")),
    path("", include("bookings.urls")),
    path("", include("reviews.urls")),
    path("", include("notifications.urls")),
    path("", include("messaging.urls")),
    path("integracion/", include("properties.urls_integration")),
    path("hospix/", include("hospix.urls")),
    path("anuncios/", include("sponsors.urls")),
    path("mis-anuncios/", include(urlpatterns_mine)),
    path("", include("site_ui.urls")),
    path("", include("audit.urls")),
]
