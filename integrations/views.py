from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador, IsPropietario
from audit.services import log_action

from .ipguide import geo_hints_from_lookup, lookup_request
from .models import IntegrationClient
from .serializers import (
    IntegrationClientDecisionSerializer,
    IntegrationClientRequestSerializer,
    IntegrationClientSerializer,
)
from .stats import activity_map_for_admin, booking_origins_for_owner, security_alerts_summary


def _sync_owner_developer_flag(user) -> None:
    """Alinea User.is_developer con clientes de integración activos."""
    has_active = IntegrationClient.objects.filter(
        owner=user,
        status=IntegrationClient.Status.ACTIVE,
    ).exists()
    if bool(getattr(user, "is_developer", False)) != has_active:
        user.is_developer = has_active
        user.save(update_fields=["is_developer"])


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


class MyIntegrationClientsView(APIView):
    """GET/POST /api/v1/integracion/clientes/mios/ — listar o solicitar acceso API."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        qs = IntegrationClient.objects.filter(owner=request.user).order_by("-created_at")
        _sync_owner_developer_flag(request.user)
        return Response(IntegrationClientSerializer(qs, many=True).data)

    def post(self, request):
        ser = IntegrationClientRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        pending = IntegrationClient.objects.filter(
            owner=request.user,
            status=IntegrationClient.Status.PENDING,
        ).exists()
        if pending:
            return Response(
                {"detail": "Ya tienes una solicitud pendiente de revisión."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if IntegrationClient.objects.filter(
            owner=request.user,
            status=IntegrationClient.Status.ACTIVE,
        ).exists():
            return Response(
                {
                    "detail": "Ya tienes un acceso de desarrollador activo. "
                    "Puedes emitir o rotar tu API Key desde el perfil."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (data.get("contact_email") or "").strip() or request.user.email
        client = IntegrationClient.objects.create(
            name=data["name"],
            organization=(data.get("organization") or "").strip(),
            contact_email=email,
            notes=(data.get("notes") or "").strip(),
            owner=request.user,
            status=IntegrationClient.Status.ACTIVE,
        )
        if not request.user.is_developer:
            request.user.is_developer = True
            request.user.save(update_fields=["is_developer"])
        log_action(
            actor=request.user,
            action="integration.client.activate",
            target_type="IntegrationClient",
            target_id=client.pk,
            target_label=client.name,
            metadata={"contact_email": client.contact_email, "self_service": True},
            request=request,
        )
        return Response(
            {
                "detail": (
                    "Acceso de desarrollador activado. Ya puedes generar tu API Key."
                ),
                "client": IntegrationClientSerializer(client).data,
                "is_developer": True,
            },
            status=status.HTTP_201_CREATED,
        )


class MyIntegrationClientIssueKeyView(APIView):
    """POST /api/v1/integracion/clientes/mios/<id>/emitir-key/ — genera/rota key (activo)."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk: int):
        try:
            client = IntegrationClient.objects.get(pk=pk, owner=request.user)
        except IntegrationClient.DoesNotExist:
            return Response({"detail": "Cliente no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if client.status != IntegrationClient.Status.ACTIVE:
            return Response(
                {"detail": "Tu acceso debe estar aprobado antes de emitir una API Key."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rotated = bool(client.key_hash)
        raw = client.assign_new_key()
        log_action(
            actor=request.user,
            action="integration.client.issue_key",
            target_type="IntegrationClient",
            target_id=client.pk,
            target_label=client.name,
            metadata={"rotated": rotated, "key_prefix": client.key_prefix},
            request=request,
        )
        return Response(
            {
                "detail": (
                    "API Key generada. Cópiala ahora; no se volverá a mostrar completa."
                    if not rotated
                    else "API Key rotada. La anterior dejó de funcionar."
                ),
                "api_key": raw,
                "key_prefix": client.key_prefix,
                "client": IntegrationClientSerializer(client).data,
            }
        )


class AdminIntegrationClientsView(APIView):
    """GET /api/v1/integracion/clientes/ — listado admin."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip()
        qs = IntegrationClient.objects.select_related("owner").order_by("-created_at")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(IntegrationClientSerializer(qs, many=True).data)


class AdminIntegrationClientDecideView(APIView):
    """POST /api/v1/integracion/clientes/<id>/decidir/ — aprobar o rechazar."""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk: int):
        ser = IntegrationClientDecisionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            client = IntegrationClient.objects.select_related("owner").get(pk=pk)
        except IntegrationClient.DoesNotExist:
            return Response({"detail": "Cliente no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        aprobado = ser.validated_data.get("aprobado", True)
        motivo = (ser.validated_data.get("motivo") or "").strip()

        if aprobado:
            client.status = IntegrationClient.Status.ACTIVE
            if motivo:
                client.notes = (client.notes + "\n" if client.notes else "") + f"Aprobado: {motivo}"
            client.save(update_fields=["status", "notes", "updated_at"])
            if client.owner_id:
                client.owner.is_developer = True
                client.owner.save(update_fields=["is_developer"])
            action = "integration.client.approve"
            detail = "Cliente de integración aprobado. El solicitante ya puede emitir su API Key."
        else:
            client.status = IntegrationClient.Status.REVOKED
            client.notes = (client.notes + "\n" if client.notes else "") + f"Rechazado: {motivo}"
            client.save(update_fields=["status", "notes", "updated_at"])
            if client.owner_id:
                _sync_owner_developer_flag(client.owner)
            action = "integration.client.reject"
            detail = "Solicitud rechazada."

        log_action(
            actor=request.user,
            action=action,
            target_type="IntegrationClient",
            target_id=client.pk,
            target_label=client.name,
            metadata={"motivo": motivo, "aprobado": aprobado},
            request=request,
        )
        return Response(
            {
                "detail": detail,
                "client": IntegrationClientSerializer(client).data,
            }
        )


class AdminIntegrationClientRevokeView(APIView):
    """POST /api/v1/integracion/clientes/<id>/revocar/"""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk: int):
        try:
            client = IntegrationClient.objects.get(pk=pk)
        except IntegrationClient.DoesNotExist:
            return Response({"detail": "Cliente no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        client.revoke()
        if client.owner_id:
            _sync_owner_developer_flag(client.owner)
        log_action(
            actor=request.user,
            action="integration.client.revoke",
            target_type="IntegrationClient",
            target_id=client.pk,
            target_label=client.name,
            request=request,
        )
        return Response(
            {
                "detail": "Cliente revocado. Su API Key ya no es válida.",
                "client": IntegrationClientSerializer(client).data,
            }
        )


class ActifyEventsListView(APIView):
    """GET /api/v1/eventos/ — proxy al catálogo público de Actify."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from .actify import ActifyError, list_events

        allowed = (
            "category_id",
            "location",
            "radius",
            "city",
            "page",
            "per_page",
        )
        params = {
            key: request.query_params.get(key)
            for key in allowed
            if request.query_params.get(key) not in (None, "")
        }
        try:
            payload = list_events(params=params)
        except ActifyError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            return Response({"detail": str(exc)}, status=http)
        return Response(payload)


class ActifyEventDetailView(APIView):
    """GET /api/v1/eventos/<id>/ — detalle + aforo en vivo (Actify)."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk: int):
        from .actify import ActifyError, get_event

        try:
            event = get_event(pk)
        except ActifyError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            return Response({"detail": str(exc)}, status=http)
        return Response(event)


class ConectaTingoDatosView(APIView):
    """GET /api/v1/lugares-turisticos/ — demanda y hotspots (Conecta Tingo)."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from .conecta_tingo import ConectaTingoError, catalog_payload

        try:
            return Response(catalog_payload())
        except ConectaTingoError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            if code == 429:
                http = status.HTTP_429_TOO_MANY_REQUESTS
            return Response({"detail": str(exc)}, status=http)


class RestoPointListView(APIView):
    """GET /api/v1/restaurantes/ — proxy al catálogo RestoPoint."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from .restopoint import RestoPointError, list_restaurants

        page_raw = (request.query_params.get("page") or "0").strip()
        size_raw = (request.query_params.get("size") or "50").strip()
        page = int(page_raw) if page_raw.isdigit() else 0
        size = int(size_raw) if size_raw.isdigit() else 50
        try:
            return Response(list_restaurants(page=page, size=size))
        except RestoPointError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            if code == 429:
                http = status.HTTP_429_TOO_MANY_REQUESTS
            return Response({"detail": str(exc)}, status=http)


class RestoPointDetailView(APIView):
    """GET /api/v1/restaurantes/<id>/ — detalle RestoPoint."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, pk: str):
        from .restopoint import RestoPointError, get_restaurant

        try:
            return Response(get_restaurant(pk))
        except RestoPointError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            if code == 429:
                http = status.HTTP_429_TOO_MANY_REQUESTS
            return Response({"detail": str(exc)}, status=http)


class NearbyExploreView(APIView):
    """GET /api/v1/alrededores/?lat=&lng=&radio_km=&ciudad= — POIs cercanos."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from .nearby import build_nearby_explore

        lat_raw = (request.query_params.get("lat") or "").strip()
        lng_raw = (request.query_params.get("lng") or "").strip()
        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Parámetros lat y lng son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        radio_raw = (request.query_params.get("radio_km") or "25").strip()
        try:
            radio = float(radio_raw)
        except ValueError:
            radio = 25.0
        city = (request.query_params.get("ciudad") or "").strip()
        return Response(
            build_nearby_explore(lat=lat, lng=lng, radio_km=radio, city=city)
        )


class ConectaTingoPlaceDetailView(APIView):
    """GET /api/v1/lugares-turisticos/<slug>/ — detalle hotspot Conecta Tingo."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, slug: str):
        from .conecta_tingo import ConectaTingoError, get_hotspot

        try:
            return Response(get_hotspot(slug))
        except ConectaTingoError as exc:
            code = exc.status_code or 502
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            if code == 404:
                http = status.HTTP_404_NOT_FOUND
            return Response({"detail": str(exc)}, status=http)
