from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    is_mock = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "booking_id",
            "amount",
            "currency",
            "method",
            "status",
            "gateway",
            "gateway_charge_id",
            "gateway_order_id",
            "failure_message",
            "paid_at",
            "expires_at",
            "external_operation_number",
            "guest_reported_amount",
            "is_mock",
            "created_at",
        )
        read_only_fields = fields

    def get_is_mock(self, obj):
        return obj.gateway == "mock"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.guest_reported_amount is not None:
            data["guest_reported_amount"] = str(instance.guest_reported_amount)
        return data


class ExternalPaymentRequestSerializer(serializers.Serializer):
    operation_number = serializers.CharField(max_length=64, trim_whitespace=True)
    reported_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_operation_number(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 4:
            raise serializers.ValidationError(
                "Ingresa un número de operación válido (mínimo 4 caracteres)."
            )
        return cleaned

    def validate_reported_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a cero.")
        return value


class OwnerPaymentListSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    hospedaje = serializers.CharField(source="booking.room.accommodation.name", read_only=True)
    habitacion = serializers.CharField(source="booking.room.number", read_only=True)
    accommodation_id = serializers.IntegerField(
        source="booking.room.accommodation_id", read_only=True
    )
    huesped = serializers.SerializerMethodField()
    check_in = serializers.DateField(source="booking.check_in", read_only=True)
    check_out = serializers.DateField(source="booking.check_out", read_only=True)
    booking_status = serializers.CharField(source="booking.status", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "booking_id",
            "hospedaje",
            "habitacion",
            "accommodation_id",
            "huesped",
            "check_in",
            "check_out",
            "booking_status",
            "amount",
            "currency",
            "method",
            "status",
            "external_operation_number",
            "guest_reported_amount",
            "paid_at",
            "created_at",
        )

    def get_huesped(self, obj):
        guest = obj.booking.guest
        return {
            "id": guest.pk,
            "nombre": guest.get_full_name() or guest.username,
            "email": guest.email,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["amount"] = str(instance.amount)
        if instance.guest_reported_amount is not None:
            data["guest_reported_amount"] = str(instance.guest_reported_amount)
        return data


class PaymentMethodsSerializer(serializers.Serializer):
    gateway = serializers.CharField()
    culqi_public_key = serializers.CharField(allow_blank=True)
    mp_public_key = serializers.CharField(allow_blank=True)
    mp_webhook_url = serializers.CharField(allow_blank=True, required=False)
    methods = serializers.ListField()


class YapePaySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)


class CardPaySerializer(serializers.Serializer):
    source_id = serializers.CharField(max_length=128)
