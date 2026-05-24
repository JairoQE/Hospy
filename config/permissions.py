from django.conf import settings
from rest_framework.permissions import BasePermission


class IsIntegrationClient(BasePermission):
    """Valida API Key del SIST en header X-Hospy-Integration-Key."""

    def has_permission(self, request, view):
        key = request.headers.get("X-Hospy-Integration-Key", "")
        expected = settings.HOSPY_INTEGRATION_API_KEY
        if not expected:
            return False
        return key == expected
