from django.conf import settings
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsPropietario
from properties.models import Accommodation

from .models import Room, RoomPhoto, SeasonRate
from .permissions import IsRoomOwner
from .serializers import (
    BlockDatesSerializer,
    PriceQuerySerializer,
    RoomPhotoSerializer,
    RoomPhotoUploadSerializer,
    RoomPublicSerializer,
    RoomSerializer,
    SeasonRateSerializer,
)
from .services import (
    block_room_dates,
    build_monthly_calendar,
    public_accommodation_for_rooms,
)


class RoomViewSet(viewsets.ModelViewSet):
    """
    Habitaciones y tarifas (Fase 2).
    - Público: GET hospedajes/{id}/habitaciones/ y detalle.
    - Propietario: CRUD + tarifas + disponibilidad + bloqueo.
    """

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve") and self.kwargs.get("hospedaje_pk"):
            return RoomPublicSerializer
        return RoomSerializer

    def get_queryset(self):
        qs = Room.objects.select_related("accommodation", "accommodation__owner")
        hospedaje_pk = self.kwargs.get("hospedaje_pk")

        if hospedaje_pk:
            try:
                public_accommodation_for_rooms(hospedaje_pk)
            except Accommodation.DoesNotExist:
                return qs.none()
            return (
                qs.filter(accommodation_id=hospedaje_pk, is_active=True)
                .prefetch_related(
                    Prefetch(
                        "fotos",
                        queryset=RoomPhoto.objects.order_by("order", "id"),
                    )
                )
            )

        if self.action in ("precio", "disponibilidad", "retrieve"):
            public_qs = qs.filter(
                is_active=True,
                accommodation__is_deleted=False,
                accommodation__status=Accommodation.Status.APROBADO,
                accommodation__is_active=True,
            )
            user = self.request.user
            if user.is_authenticated and user.role == user.Role.PROPIETARIO:
                return (qs.filter(accommodation__owner=user) | public_qs).distinct()
            if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
                return qs
            return public_qs

        user = self.request.user
        if user.is_authenticated and user.role == user.Role.PROPIETARIO:
            qs = qs.filter(accommodation__owner=user, accommodation__is_deleted=False)
            if self.action == "list":
                acc_id = self.request.query_params.get("accommodation")
                if acc_id:
                    qs = qs.filter(accommodation_id=acc_id)
            return qs

        if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
            return qs

        return qs.none()

    def get_permissions(self):
        if self.kwargs.get("hospedaje_pk") and self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        if self.action in ("precio", "disponibilidad"):
            return [permissions.AllowAny()]
        if self.action == "list":
            return [IsPropietario()]
        if self.action == "retrieve":
            return [permissions.AllowAny()]
        if self.action == "create":
            return [IsPropietario()]
        return [IsPropietario(), IsRoomOwner()]

    def get_object(self):
        if self.kwargs.get("hospedaje_pk"):
            return get_object_or_404(
                self.get_queryset(),
                pk=self.kwargs["pk"],
            )
        return super().get_object()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        hospedaje_pk = self.kwargs.get("hospedaje_pk")
        if hospedaje_pk and "accommodation" not in data:
            data["accommodation"] = hospedaje_pk
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(
            RoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        room.is_active = False
        room.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="desactivar")
    def desactivar(self, request, pk=None):
        room = self.get_object()
        room.is_active = False
        room.save(update_fields=["is_active", "updated_at"])
        return Response(RoomSerializer(room, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="activar")
    def activar(self, request, pk=None):
        room = self.get_object()
        if room.accommodation.status != Accommodation.Status.APROBADO:
            return Response(
                {"detail": "El hospedaje debe estar aprobado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        room.is_active = True
        room.save(update_fields=["is_active", "updated_at"])
        return Response(RoomSerializer(room, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="precio")
    def precio(self, request, pk=None):
        """GET /api/v1/habitaciones/{id}/precio/?entrada=&salida="""
        room = self.get_object()
        if not room.is_active:
            raise NotFound()
        if self.kwargs.get("hospedaje_pk"):
            try:
                public_accommodation_for_rooms(room.accommodation_id)
            except Accommodation.DoesNotExist:
                raise NotFound()

        query = PriceQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.to_representation(query.validated_data)
        data["room_id"] = room.id
        return Response(data)

    @action(detail=True, methods=["get"], url_path="disponibilidad")
    def disponibilidad(self, request, pk=None):
        """GET /api/v1/habitaciones/{id}/disponibilidad/?anio=2026&mes=5"""
        room = self.get_object()
        try:
            year = int(
                request.query_params.get("anio") or request.query_params.get("year")
            )
            month = int(
                request.query_params.get("mes") or request.query_params.get("month")
            )
        except (TypeError, ValueError):
            raise ValidationError(
                {"detail": "Parámetros requeridos: anio y mes (ej. ?anio=2026&mes=5)."}
            )
        if month < 1 or month > 12:
            raise ValidationError({"mes": "Debe estar entre 1 y 12."})

        return Response(
            {
                "room_id": room.id,
                "anio": year,
                "mes": month,
                "days": build_monthly_calendar(room, year, month),
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="tarifas")
    def tarifas(self, request, pk=None):
        room = self.get_object()
        if request.method == "GET":
            return Response(SeasonRateSerializer(room.tarifas.all(), many=True).data)

        serializer = SeasonRateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(room=room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"tarifas/(?P<tarifa_pk>\d+)",
    )
    def tarifa_detalle(self, request, pk=None, tarifa_pk=None):
        room = self.get_object()
        tarifa = get_object_or_404(SeasonRate, pk=tarifa_pk, room=room)

        if request.method == "DELETE":
            tarifa.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = SeasonRateSerializer(tarifa, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="fotos")
    def fotos(self, request, pk=None):
        """GET/POST fotos de habitación — RF-22."""
        room = self.get_object()
        if request.method == "GET":
            return Response(
                RoomPhotoSerializer(
                    room.fotos.all(), many=True, context={"request": request}
                ).data
            )

        max_photos = settings.MAX_ROOM_PHOTOS
        if room.fotos.count() >= max_photos:
            return Response(
                {"detail": f"Máximo {max_photos} fotos por habitación."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = RoomPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(room=room)

        from .tasks import process_room_photo_task

        process_room_photo_task.delay(photo.pk)
        return Response(
            RoomPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"fotos/(?P<foto_id>\d+)")
    def eliminar_foto(self, request, pk=None, foto_id=None):
        room = self.get_object()
        photo = get_object_or_404(room.fotos, pk=foto_id)
        photo.image.delete(save=False)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="bloquear")
    def bloquear(self, request, pk=None):
        """POST body: fecha_inicio, fecha_fin, motivo (bloqueo|mantenimiento)"""
        room = self.get_object()
        serializer = BlockDatesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            count = block_room_dates(
                room,
                serializer.validated_data["fecha_inicio"],
                serializer.validated_data["fecha_fin"],
                serializer.validated_data["motivo"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(
            {
                "detail": f"Se bloquearon {count} fecha(s).",
                "fecha_inicio": serializer.validated_data["fecha_inicio"],
                "fecha_fin": serializer.validated_data["fecha_fin"],
            },
            status=status.HTTP_201_CREATED,
        )
