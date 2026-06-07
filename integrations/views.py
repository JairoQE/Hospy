from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador, IsPropietario

from .ipguide import geo_hints_from_lookup, lookup_request
from .stats import activity_map_for_admin, booking_origins_for_owner, security_alerts_summary


class GeoHintsView(APIView):
    """GET /api/v1/geo/sugerencias/ — idioma/moneda sugeridos por IP (público)."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        geo = lookup_request(request)
        hints = geo_hints_from_lookup(geo)
        return Response({"geo": geo, "hints": hints})


class OwnerBookingOriginsView(APIView):
    """GET /api/v1/geo/propietario/origen-reservas/ — analytics de origen."""

    permission_classes = (IsPropietario,)

    def get(self, request):
        days_raw = (request.query_params.get("days") or "30").strip()
        days = int(days_raw) if days_raw.isdigit() else 30
        days = max(7, min(days, 365))
        data = booking_origins_for_owner(request.user.pk, days=days)
        return Response(data)


class AdminActivityMapView(APIView):
    """GET /api/v1/geo/admin/mapa-actividad/ — puntos para mapa admin."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        days_raw = (request.query_params.get("days") or "7").strip()
        days = int(days_raw) if days_raw.isdigit() else 7
        days = max(1, min(days, 90))
        return Response(activity_map_for_admin(days=days))


class AdminSecurityAlertsView(APIView):
    """GET /api/v1/geo/admin/alertas-seguridad/ — alertas ip.guide."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        limit_raw = (request.query_params.get("limit") or "30").strip()
        limit = int(limit_raw) if limit_raw.isdigit() else 30
        unresolved = (request.query_params.get("resolved") or "").lower() not in (
            "1",
            "true",
            "yes",
        )
        return Response(
            security_alerts_summary(limit=min(limit, 100), unresolved_only=unresolved)
        )


class AdminResolveSecurityAlertView(APIView):
    """POST /api/v1/geo/admin/alertas-seguridad/<id>/resolver/"""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk: int):
        from .models import IpSecurityAlert

        try:
            alert = IpSecurityAlert.objects.get(pk=pk)
        except IpSecurityAlert.DoesNotExist:
            return Response(
                {"detail": "Alerta no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        alert.is_resolved = True
        alert.save(update_fields=["is_resolved"])
        return Response({"detail": "Alerta marcada como resuelta.", "id": alert.pk})
