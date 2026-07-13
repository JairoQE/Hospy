from rest_framework import serializers

from .models import IntegrationClient


class IntegrationClientSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    has_api_key = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source="owner.email", read_only=True, default="")

    class Meta:
        model = IntegrationClient
        fields = (
            "id",
            "name",
            "organization",
            "contact_email",
            "status",
            "status_display",
            "key_prefix",
            "has_api_key",
            "request_count",
            "last_used_at",
            "notes",
            "owner_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_has_api_key(self, obj) -> bool:
        return bool(obj.key_hash)


class IntegrationClientRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    organization = serializers.CharField(
        max_length=120, required=False, allow_blank=True, default=""
    )
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise serializers.ValidationError("Indica el nombre del sistema (mín. 3 caracteres).")
        return cleaned


class IntegrationClientDecisionSerializer(serializers.Serializer):
    aprobado = serializers.BooleanField(default=True)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if not data.get("aprobado", True) and not (data.get("motivo") or "").strip():
            raise serializers.ValidationError(
                {"motivo": "Indica el motivo del rechazo."}
            )
        return data
