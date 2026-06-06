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
            "is_mock",
            "created_at",
        )
        read_only_fields = fields

    def get_is_mock(self, obj):
        return obj.gateway == "mock"


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
