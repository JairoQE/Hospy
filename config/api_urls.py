"""
Rutas API v1 — alineadas al documento de requisitos Hospy.
"""

from django.urls import include, path

urlpatterns = [
    path("auth/", include("accounts.urls")),
    path("", include("properties.urls")),
    path("", include("rooms.urls")),
    path("", include("bookings.urls")),
    path("", include("reviews.urls")),
    path("", include("notifications.urls")),
    path("", include("messaging.urls")),
    path("integracion/", include("properties.urls_integration")),
]
