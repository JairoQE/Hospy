from rest_framework import serializers

from .models import BookingRefund


class OwnerRegisterRefundSerializer(serializers.Serializer):
    operation_number = serializers.CharField(max_length=64)
    reported_amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class GuestDisputeRefundSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class DisputedRefundAdminSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    hospedaje = serializers.CharField(
        source="booking.room.accommodation.name", read_only=True
    )
    habitacion = serializers.CharField(source="booking.room.number", read_only=True)
    check_in = serializers.DateField(source="booking.check_in", read_only=True)
    huesped = serializers.SerializerMethodField()
    propietario = serializers.SerializerMethodField()
    owner_strikes = serializers.IntegerField(
        source="booking.room.accommodation.owner.owner_strikes", read_only=True
    )

    class Meta:
        model = BookingRefund
        fields = (
            "id",
            "booking_id",
            "hospedaje",
            "habitacion",
            "check_in",
            "huesped",
            "propietario",
            "status",
            "refund_percent",
            "refund_amount",
            "due_at",
            "owner_operation_number",
            "owner_reported_amount",
            "owner_reported_at",
            "dispute_notes",
            "disputed_at",
            "owner_strikes",
            "created_at",
        )

    def get_huesped(self, obj):
        g = obj.booking.guest
        return {
            "id": g.id,
            "email": g.email,
            "nombre": g.get_full_name() or g.username,
        }

    def get_propietario(self, obj):
        o = obj.booking.room.accommodation.owner
        return {
            "id": o.id,
            "email": o.email,
            "nombre": o.get_full_name() or o.username,
            "owner_strikes": o.owner_strikes,
        }


class OwnerWarnSerializer(serializers.Serializer):
    warning = serializers.CharField(max_length=2000)
    accion = serializers.ChoiceField(
        choices=("advertencia", "desactivar_cuenta"),
        default="advertencia",
    )
