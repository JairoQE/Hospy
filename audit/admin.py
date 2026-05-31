from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "actor_email",
        "actor_role",
        "target_label",
    )
    list_filter = ("action", "actor_role", "target_type")
    search_fields = ("actor_email", "actor_name", "target_label", "action")
    readonly_fields = (
        "actor",
        "actor_role",
        "actor_email",
        "actor_name",
        "action",
        "target_type",
        "target_id",
        "target_label",
        "metadata",
        "ip_address",
        "user_agent",
        "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
