from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador
from audit.services import log_action

from .models import SiteDesignSettings
from .serializers import SiteDesignSettingsSerializer


class SiteDesignSettingsView(APIView):
    """GET público · PATCH solo administrador."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [IsAdministrador()]

    def get(self, request):
        settings = SiteDesignSettings.load()
        return Response(SiteDesignSettingsSerializer(settings).data)

    def patch(self, request):
        settings = SiteDesignSettings.load()
        before = SiteDesignSettingsSerializer(settings).data
        ser = SiteDesignSettingsSerializer(settings, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        changed = [
            key
            for key in ser.validated_data
            if before.get(key) != ser.data.get(key)
        ]
        log_action(
            actor=request.user,
            action="site_design.update",
            target_type="SiteDesignSettings",
            target_id=settings.pk,
            target_label="Diseño del sitio",
            metadata={"fields": changed},
            request=request,
        )
        return Response(ser.data)
