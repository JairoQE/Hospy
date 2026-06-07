from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador, IsHuesped, IsPropietario

from audit.services import log_action

from .models import Booking
from .permissions import CanCancelBooking, IsBookingPropertyOwner
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    BookingPreviewSerializer,
)
from payments.services import create_payment_for_booking

from .services import (
    cancel_booking,
    complete_booking,
    confirm_booking,
    reject_booking,
)


class BookingPreviewView(APIView):
    """POST /api/v1/reservas/preview/ — cotización sin crear reserva."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = BookingPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class BookingViewSet(viewsets.GenericViewSet):
    """Reservas: huésped crea; propietario confirma/rechaza; ambos pueden cancelar."""

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related(
            "room",
            "room__accommodation",
            "guest",
            "payment",
        )
        if user.role == user.Role.HUESPED:
            return qs.filter(guest=user)
        if user.role == user.Role.PROPIETARIO:
            return qs.filter(room__accommodation__owner=user)
        if user.role == user.Role.ADMINISTRADOR:
            return qs
        return qs.none()

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        if self.action == "retrieve":
            return BookingDetailSerializer
        return BookingListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsHuesped()]
        if self.action in ("confirmar", "rechazar"):
            return [IsPropietario(), IsBookingPropertyOwner()]
        if self.action == "cancelar":
            return [permissions.IsAuthenticated(), CanCancelBooking()]
        if self.action == "completar":
            return [IsPropietario(), IsBookingPropertyOwner()]
        if self.action == "mias":
            return [IsHuesped()]
        if self.action == "propietario":
            return [IsPropietario()]
        if self.action == "retrieve":
            return [permissions.IsAuthenticated()]
        if self.action == "list":
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        serializer = BookingListSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        booking = self.get_object()
        if (
            request.user.role == request.user.Role.HUESPED
            and booking.guest_id != request.user.id
        ):
            raise PermissionDenied()
        if (
            request.user.role == request.user.Role.PROPIETARIO
            and booking.room.accommodation.owner_id != request.user.id
        ):
            raise PermissionDenied()
        return Response(BookingDetailSerializer(booking).data)

    def create(self, request):
        serializer = BookingCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                booking = serializer.save()
                create_payment_for_booking(booking)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        except Exception as exc:
            raise ValidationError(
                {
                    "detail": (
                        "No se pudo registrar el pago de la reserva. "
                        "Si el problema continúa, contacta al administrador."
                    )
                }
            ) from exc

        booking = self.get_queryset().get(pk=booking.pk)
        log_action(
            actor=request.user,
            action="booking.create",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk} · {booking.room.accommodation.name}",
            metadata={
                "check_in": str(booking.check_in),
                "check_out": str(booking.check_out),
                "total_amount": str(booking.total_amount),
            },
            request=request,
        )
        return Response(
            BookingDetailSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="mias")
    def mias(self, request):
        qs = Booking.objects.filter(guest=request.user).select_related(
            "room", "room__accommodation", "guest"
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        page = self.paginate_queryset(qs.order_by("-created_at"))
        serializer = BookingListSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="propietario")
    def propietario(self, request):
        qs = self.get_queryset()
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        page = self.paginate_queryset(qs.order_by("-created_at"))
        serializer = BookingListSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="confirmar")
    def confirmar(self, request, pk=None):
        booking = self.get_object()
        try:
            confirm_booking(booking)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        log_action(
            actor=request.user,
            action="booking.confirm",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            request=request,
        )
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        booking = self.get_object()
        try:
            reject_booking(booking)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        log_action(
            actor=request.user,
            action="booking.reject",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            request=request,
        )
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        booking = self.get_object()
        try:
            cancel_booking(booking, actor=request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        log_action(
            actor=request.user,
            action="booking.cancel",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            request=request,
        )
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="completar")
    def completar(self, request, pk=None):
        booking = self.get_object()
        try:
            complete_booking(booking)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        log_action(
            actor=request.user,
            action="booking.complete",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            request=request,
        )
        return Response(BookingDetailSerializer(booking).data)
