from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from rooms.models import Room
from rooms.services import calculate_stay_total

from .models import Booking
from .services import booking_cancellation_status, create_booking, is_room_available


class BookingListSerializer(serializers.ModelSerializer):
    hospedaje = serializers.CharField(source="room.accommodation.name", read_only=True)
    habitacion = serializers.CharField(source="room.number", read_only=True)
    ciudad = serializers.CharField(source="room.accommodation.city", read_only=True)
    accommodation_id = serializers.IntegerField(
        source="room.accommodation_id", read_only=True
    )
    can_leave_review = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    cancel_reason = serializers.SerializerMethodField()
    huesped = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    refund_if_cancel_now = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "hospedaje",
            "habitacion",
            "ciudad",
            "accommodation_id",
            "huesped",
            "check_in",
            "check_out",
            "total_amount",
            "status",
            "created_at",
            "can_leave_review",
            "has_review",
            "can_cancel",
            "cancel_reason",
            "payment",
            "refund_if_cancel_now",
        )

    def get_can_leave_review(self, obj):
        if obj.status != Booking.Status.COMPLETADA:
            return False
        from reviews.services import guest_already_reviewed

        return not guest_already_reviewed(obj.guest, obj.room.accommodation_id)

    def get_has_review(self, obj):
        from reviews.services import guest_already_reviewed

        return guest_already_reviewed(obj.guest, obj.room.accommodation_id)

    def _cancellation_for_viewer(self, obj) -> tuple[bool, str | None]:
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return False, None
        return booking_cancellation_status(obj, request.user)

    def get_can_cancel(self, obj):
        allowed, _ = self._cancellation_for_viewer(obj)
        return allowed

    def get_cancel_reason(self, obj):
        allowed, reason = self._cancellation_for_viewer(obj)
        return None if allowed else reason

    def get_huesped(self, obj):
        return {
            "id": obj.guest_id,
            "email": obj.guest.email,
            "nombre": obj.guest.get_full_name() or obj.guest.username,
        }

    def get_payment(self, obj):
        try:
            payment = obj.payment
        except ObjectDoesNotExist:
            return None
        return {
            "id": payment.id,
            "status": payment.status,
            "method": payment.method or None,
            "amount": str(payment.amount),
        }

    def get_refund_if_cancel_now(self, obj):
        if obj.status not in (Booking.Status.PENDIENTE, Booking.Status.CONFIRMADA):
            return None
        from properties.refund_policy import estimate_refund_percent

        acc = obj.room.accommodation
        est = estimate_refund_percent(acc, check_in=obj.check_in)
        return {
            "percent": est.percent,
            "label": est.label,
            "policy_type": est.policy_type,
        }


class AdminDashboardBookingSerializer(serializers.ModelSerializer):
    """Reserva ligera para el bootstrap del panel admin (sin consultas extra por fila)."""

    hospedaje = serializers.CharField(source="room.accommodation.name", read_only=True)
    habitacion = serializers.CharField(source="room.number", read_only=True)
    ciudad = serializers.CharField(source="room.accommodation.city", read_only=True)
    accommodation_id = serializers.IntegerField(
        source="room.accommodation_id", read_only=True
    )
    huesped = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "hospedaje",
            "habitacion",
            "ciudad",
            "accommodation_id",
            "huesped",
            "check_in",
            "check_out",
            "total_amount",
            "status",
            "created_at",
        )

    def get_huesped(self, obj):
        return {
            "id": obj.guest_id,
            "email": obj.guest.email,
            "nombre": obj.guest.get_full_name() or obj.guest.username,
        }


class BookingDetailSerializer(BookingListSerializer):
    room_id = serializers.IntegerField(source="room.id", read_only=True)
    desglose_precio = serializers.SerializerMethodField()

    class Meta(BookingListSerializer.Meta):
        fields = BookingListSerializer.Meta.fields + (
            "room_id",
            "desglose_precio",
            "updated_at",
        )

    def get_payment(self, obj):
        try:
            payment = obj.payment
        except ObjectDoesNotExist:
            return None
        return {
            "id": payment.id,
            "status": payment.status,
            "method": payment.method or None,
            "amount": str(payment.amount),
            "expires_at": payment.expires_at.isoformat() if payment.expires_at else None,
        }

    def get_desglose_precio(self, obj):
        if obj.status == Booking.Status.CANCELADA:
            return None
        try:
            return calculate_stay_total(obj.room, obj.check_in, obj.check_out)
        except ValueError:
            return None


class BookingCreateSerializer(serializers.Serializer):
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.select_related("accommodation")
    )
    check_in = serializers.DateField()
    check_out = serializers.DateField()

    def validate(self, data):
        room = data["room"]
        check_in = data["check_in"]
        check_out = data["check_out"]
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            existing = Booking.objects.filter(
                guest=request.user,
                room=room,
                check_in=check_in,
                check_out=check_out,
                status=Booking.Status.PENDIENTE,
            ).first()
            if existing:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            f"Ya tienes una reserva pendiente (#{existing.pk}) "
                            "para esta habitación y fechas. Revisa «Mis reservas» o espera "
                            "a que expire el plazo de pago."
                        )
                    }
                )
        available, message = is_room_available(room, check_in, check_out)
        if not available:
            raise serializers.ValidationError({"detail": message})
        return data

    def create(self, validated_data):
        request = self.context["request"]
        return create_booking(
            request.user,
            validated_data["room"],
            validated_data["check_in"],
            validated_data["check_out"],
        )


class BookingPreviewSerializer(serializers.Serializer):
    """Vista previa de precio antes de confirmar reserva."""

    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all())
    check_in = serializers.DateField()
    check_out = serializers.DateField()

    def validate(self, data):
        available, message = is_room_available(
            data["room"], data["check_in"], data["check_out"]
        )
        if not available:
            raise serializers.ValidationError({"detail": message})
        return data

    def to_representation(self, instance):
        return calculate_stay_total(
            instance["room"], instance["check_in"], instance["check_out"]
        )
