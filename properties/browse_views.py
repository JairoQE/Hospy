from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador
from audit.services import log_action

from .browse_serializers import BrowseTileAdminSerializer, BrowseTilePublicSerializer
from .browse_stats import build_browse_tile_stats_map
from .featured_searches import build_featured_searches
from .models import BrowseTile, BrowseTileClick
from .ubigeo_loader import list_departamentos


@method_decorator(cache_page(60 * 10), name="dispatch")
class HomeInicioBootstrapView(APIView):
    """GET /api/v1/inicio-bootstrap/ — datos del home en una sola petición."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        active = BrowseTile.objects.filter(is_active=True)
        serializer = BrowseTilePublicSerializer
        return Response(
            {
                "tipo": serializer(
                    active.filter(group=BrowseTile.Group.ACCOMMODATION_TYPE),
                    many=True,
                ).data,
                "region": serializer(
                    active.filter(group=BrowseTile.Group.NATURAL_REGION),
                    many=True,
                ).data,
                "departamento": serializer(
                    active.filter(group=BrowseTile.Group.DEPARTMENT),
                    many=True,
                ).data,
                "ubigeo_departamentos": list_departamentos(),
                "busquedas_destacadas": build_featured_searches(),
                "tile_stats": build_browse_tile_stats_map(),
            }
        )


class BrowseTileViewSet(viewsets.ModelViewSet):
    """
    Bloques del home (tipos, regiones y departamentos).
    - Público: GET list (solo activos).
    - Admin: CRUD completo con imágenes.
    """

    queryset = BrowseTile.objects.all()
    pagination_class = None
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ("group", "is_active")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "registrar_clic"):
            return [permissions.AllowAny()]
        return [IsAdministrador()]

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
            return BrowseTileAdminSerializer
        return BrowseTilePublicSerializer

    def get_queryset(self):
        qs = BrowseTile.objects.all()
        user = self.request.user
        is_admin = (
            user.is_authenticated and user.role == user.Role.ADMINISTRADOR
        )
        if self.action == "registrar_clic":
            return qs.filter(is_active=True)
        if is_admin and self.action == "list":
            since = timezone.now() - timedelta(days=30)
            qs = qs.annotate(
                clicks_30d=Count(
                    "clicks",
                    filter=Q(clicks__created_at__gte=since),
                )
            )
        if self.action in ("list", "retrieve") and not is_admin:
            qs = qs.filter(is_active=True)
        group = self.request.query_params.get("group")
        if group:
            valid_groups = (
                BrowseTile.Group.ACCOMMODATION_TYPE,
                BrowseTile.Group.NATURAL_REGION,
                BrowseTile.Group.DEPARTMENT,
            )
            if group not in valid_groups:
                raise ValidationError(
                    {"group": "Use 'tipo', 'region' o 'departamento'."}
                )
        return qs

    @action(detail=True, methods=["post"], url_path="registrar-clic")
    def registrar_clic(self, request, pk=None):
        """Registra un clic en una tarjeta activa del home (público)."""
        tile = self.get_object()
        BrowseTileClick.objects.create(tile=tile)
        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        label = instance.title
        tile_id = instance.pk
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()
        log_action(
            actor=self.request.user,
            action="browse_tile.delete",
            target_type="BrowseTile",
            target_id=tile_id,
            target_label=label,
            request=self.request,
        )

    def perform_create(self, serializer):
        tile = serializer.save()
        log_action(
            actor=self.request.user,
            action="browse_tile.create",
            target_type="BrowseTile",
            target_id=tile.pk,
            target_label=tile.title,
            request=self.request,
        )

    def perform_update(self, serializer):
        tile = serializer.save()
        log_action(
            actor=self.request.user,
            action="browse_tile.update",
            target_type="BrowseTile",
            target_id=tile.pk,
            target_label=tile.title,
            metadata={"fields": list(serializer.validated_data.keys())},
            request=self.request,
        )
