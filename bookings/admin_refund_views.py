from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdministrador
from audit.services import log_action

from .models import BookingRefund
from .refund_serializers import DisputedRefundAdminSerializer, OwnerWarnSerializer


class DisputedRefundsListView(generics.ListAPIView):
    """GET /api/v1/admin/reembolsos-disputados/ — cola de reembolsos reportados."""

    permission_classes = (IsAdministrador,)
    serializer_class = DisputedRefundAdminSerializer

    def get_queryset(self):
        return (
            BookingRefund.objects.filter(status=BookingRefund.Status.DISPUTADO)
            .select_related(
                "booking",
                "booking__guest",
                "booking__room",
                "booking__room__accommodation",
                "booking__room__accommodation__owner",
            )
            .order_by("-disputed_at", "-created_at")
        )


class DisputedRefundResolveView(APIView):
    """POST /api/v1/admin/reembolsos-disputados/{id}/resolver/ — amonestar propietario."""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        refund = get_object_or_404(
            BookingRefund.objects.select_related(
                "booking__room__accommodation__owner"
            ),
            pk=pk,
            status=BookingRefund.Status.DISPUTADO,
        )
        serializer = OwnerWarnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warning = serializer.validated_data["warning"].strip()
        if not warning:
            raise ValidationError({"warning": "Indica el mensaje de advertencia."})

        accion = serializer.validated_data["accion"]
        owner = refund.booking.room.accommodation.owner
        now = timezone.now()

        owner.owner_warning_message = warning
        owner.owner_warning_at = now
        owner.owner_strikes = (owner.owner_strikes or 0) + 1

        update_fields = ["owner_warning_message", "owner_warning_at", "owner_strikes"]
        if accion == "desactivar_cuenta":
            owner.is_active = False
            update_fields.append("is_active")

        owner.save(update_fields=update_fields)

        from notifications.services import notify_owner_warned_inbox

        notify_owner_warned_inbox(owner, warning, accion=accion)

        log_action(
            actor=request.user,
            action="owner.warn",
            target_type="User",
            target_id=owner.pk,
            target_label=owner.email,
            metadata={
                "accion": accion,
                "warning": warning,
                "refund_id": refund.pk,
                "booking_id": refund.booking_id,
                "strikes": owner.owner_strikes,
            },
            request=request,
        )

        return Response(
            DisputedRefundAdminSerializer(refund).data,
            status=status.HTTP_200_OK,
        )


class PropietarioAmonestarView(APIView):
    """POST /api/v1/auth/propietarios/{id}/amonestar/ — advertencia directa del admin."""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        owner = get_object_or_404(
            User,
            pk=pk,
            role=User.Role.PROPIETARIO,
            is_active=True,
        )
        serializer = OwnerWarnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        warning = serializer.validated_data["warning"].strip()
        if not warning:
            raise ValidationError({"warning": "Indica el mensaje de advertencia."})

        accion = serializer.validated_data["accion"]
        now = timezone.now()

        owner.owner_warning_message = warning
        owner.owner_warning_at = now
        owner.owner_strikes = (owner.owner_strikes or 0) + 1

        update_fields = ["owner_warning_message", "owner_warning_at", "owner_strikes"]
        if accion == "desactivar_cuenta":
            owner.is_active = False
            update_fields.append("is_active")

        owner.save(update_fields=update_fields)

        from notifications.services import notify_owner_warned_inbox

        notify_owner_warned_inbox(owner, warning, accion=accion)

        log_action(
            actor=request.user,
            action="owner.warn",
            target_type="User",
            target_id=owner.pk,
            target_label=owner.email,
            metadata={"accion": accion, "warning": warning, "strikes": owner.owner_strikes},
            request=request,
        )

        return Response(
            {
                "id": owner.id,
                "owner_warning_message": owner.owner_warning_message,
                "owner_warning_at": owner.owner_warning_at.isoformat(),
                "owner_strikes": owner.owner_strikes,
                "is_active": owner.is_active,
            }
        )
