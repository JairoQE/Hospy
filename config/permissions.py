from django.conf import settings
from rest_framework.permissions import BasePermission

from integrations.auth import authenticate_integration_key


class IsIntegrationClient(BasePermission):
    """
    Valida API Key en header X-Hospy-Integration-Key.

    Acepta clientes registrados activos (BD) o la key legacy de settings.
    Deja el resultado en request.integration_auth.
    """

    message = "API Key de integración inválida o ausente."

    def has_permission(self, request, view):
        raw = request.headers.get("X-Hospy-Integration-Key", "")
        auth = authenticate_integration_key(raw)
        request.integration_auth = auth
        if auth is None:
            # Fallback estricto si no hay key en BD ni env: denegar
            if not getattr(settings, "HOSPY_INTEGRATION_API_KEY", "").strip():
                # Aún puede haber clientes en BD; authenticate ya los miró
                pass
            return False
        return True
