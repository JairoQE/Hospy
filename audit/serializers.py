from rest_framework import serializers

from .actions import action_category, action_label, action_severity
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(read_only=True)
    severity = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "created_at",
            "actor",
            "actor_role",
            "actor_email",
            "actor_name",
            "action",
            "action_label",
            "severity",
            "category",
            "target_type",
            "target_id",
            "target_label",
            "metadata",
            "ip_address",
            "user_agent",
            "is_archived",
        )
        read_only_fields = fields

    def get_severity(self, obj) -> str:
        return action_severity(obj.action)

    def get_category(self, obj) -> str:
        return action_category(obj.action)
