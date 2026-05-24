from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsAdministrador

from .browse_serializers import BrowseTileAdminSerializer, BrowseTilePublicSerializer
from .models import BrowseTile


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

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
            return BrowseTileAdminSerializer
        return BrowseTilePublicSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsAdministrador()]

    def get_queryset(self):
        qs = BrowseTile.objects.all()
        user = self.request.user
        is_admin = (
            user.is_authenticated and user.role == user.Role.ADMINISTRADOR
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

    def perform_destroy(self, instance):
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()
