import logging

from django.db import transaction
from django.db.models import Q
from django.db.utils import DatabaseError, ProgrammingError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    CanBookAsGuest,
    IsAdministrador,
    IsPropietario,
)

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

from .refund_serializers import OwnerRegisterRefundSerializer, GuestDisputeRefundSerializer
from .refund_services import (
    guest_confirm_refund,
    guest_dispute_refund,
    owner_register_refund,
    serialize_refund,
)

from .services import (
    cancel_booking,
    complete_booking,
    confirm_booking,
    notify_booking_created_safe,
    reject_booking,
)

logger = logging.getLogger(__name__)


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
        ).prefetch_related("refund")
        if user.role == user.Role.ADMINISTRADOR:
            return qs
        # Multirol: ver reservas propias como huésped y, si es propietario, las de sus hospedajes.
        q = Q(guest=user)
        if user.role == user.Role.PROPIETARIO:
            q |= Q(room__accommodation__owner=user)
        return qs.filter(q).distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        if self.action == "retrieve":
            return BookingDetailSerializer
        return BookingListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [CanBookAsGuest()]
        if self.action in ("confirmar", "rechazar"):
            return [IsPropietario(), IsBookingPropertyOwner()]
        if self.action == "cancelar":
            return [permissions.IsAuthenticated(), CanCancelBooking()]
        if self.action == "completar":
            return [IsPropietario(), IsBookingPropertyOwner()]
        if self.action in (
            "reembolso_registrar",
        ):
            return [IsPropietario(), IsBookingPropertyOwner()]
        if self.action in (
            "reembolso_confirmar",
            "reembolso_disputar",
        ):
            return [CanBookAsGuest()]
        if self.action == "mias":
            return [CanBookAsGuest()]
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
        user = request.user
        if user.role == user.Role.ADMINISTRADOR:
            return Response(BookingDetailSerializer(booking).data)
        is_guest = booking.guest_id == user.id
        is_property_owner = booking.room.accommodation.owner_id == user.id
        if not (is_guest or is_property_owner):
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
        except (ProgrammingError, DatabaseError) as exc:
            logger.exception("Error de base de datos al crear pago para reserva")
            msg = str(exc).lower()
            if "payment" in msg or "payments_" in msg:
                raise ValidationError(
                    {
                        "detail": (
                            "Falta inicializar pagos en el servidor. "
                            "Ejecuta «python manage.py migrate payments» en Render y vuelve a intentar."
                        )
                    }
                ) from exc
            raise ValidationError(
                {"detail": "Error de base de datos al registrar la reserva."}
            ) from exc
        except Exception as exc:
            logger.exception("Error inesperado al crear reserva con pago")
            raise ValidationError(
                {
                    "detail": (
                        "No se pudo completar la reserva. "
                        "Inténtalo de nuevo en unos segundos."
                    )
                }
            ) from exc

        notify_booking_created_safe(booking)

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
            "room", "room__accommodation", "guest", "payment"
        ).prefetch_related("refund")
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
        qs = (
            Booking.objects.filter(room__accommodation__owner=request.user)
            .select_related("room", "room__accommodation", "guest", "payment")
            .prefetch_related("refund")
        )
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
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingDetailSerializer(booking, context={"request": request}).data
        )

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
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingDetailSerializer(booking, context={"request": request}).data
        )

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
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingDetailSerializer(booking, context={"request": request}).data
        )

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
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            BookingDetailSerializer(booking, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="reembolso/registrar")
    def reembolso_registrar(self, request, pk=None):
        booking = self.get_object()
        serializer = OwnerRegisterRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refund = owner_register_refund(
                booking,
                request.user,
                operation_number=serializer.validated_data["operation_number"],
                reported_amount=serializer.validated_data["reported_amount"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        from notifications.services import notify_refund_registered_inbox

        notify_refund_registered_inbox(booking, refund)
        log_action(
            actor=request.user,
            action="booking.refund.register",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            metadata={
                "operation_number": refund.owner_operation_number,
                "amount": str(refund.owner_reported_amount),
            },
            request=request,
        )
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            {
                "refund": serialize_refund(refund),
                "booking": BookingDetailSerializer(
                    booking, context={"request": request}
                ).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="reembolso/confirmar")
    def reembolso_confirmar(self, request, pk=None):
        booking = self.get_object()
        if booking.guest_id != request.user.id:
            raise PermissionDenied()
        try:
            refund = guest_confirm_refund(booking, request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        from notifications.services import notify_refund_confirmed_inbox

        notify_refund_confirmed_inbox(booking, refund)
        log_action(
            actor=request.user,
            action="booking.refund.confirm",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            request=request,
        )
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            {
                "refund": serialize_refund(refund),
                "booking": BookingDetailSerializer(
                    booking, context={"request": request}
                ).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="reembolso/disputar")
    def reembolso_disputar(self, request, pk=None):
        booking = self.get_object()
        if booking.guest_id != request.user.id:
            raise PermissionDenied()
        serializer = GuestDisputeRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refund = guest_dispute_refund(
                booking,
                request.user,
                notes=serializer.validated_data.get("notes", ""),
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        from notifications.services import notify_refund_disputed_inbox

        notify_refund_disputed_inbox(booking, refund)
        log_action(
            actor=request.user,
            action="booking.refund.dispute",
            target_type="Booking",
            target_id=booking.pk,
            target_label=f"Reserva #{booking.pk}",
            metadata={"notes": refund.dispute_notes},
            request=request,
        )
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(
            {
                "refund": serialize_refund(refund),
                "booking": BookingDetailSerializer(
                    booking, context={"request": request}
                ).data,
            }
        )
