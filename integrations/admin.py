from django.contrib import admin, messages
from django.utils.html import format_html

from .models import IntegrationClient, IpSecurityAlert


@admin.register(IntegrationClient)
class IntegrationClientAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "contact_email",
        "status",
        "key_prefix",
        "request_count",
        "last_used_at",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("name", "organization", "contact_email", "key_prefix")
    readonly_fields = (
        "key_prefix",
        "key_hash",
        "request_count",
        "last_used_at",
        "created_at",
        "updated_at",
        "key_help",
    )
    actions = ("activate_clients", "revoke_clients", "rotate_api_keys")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name",
                    "organization",
                    "contact_email",
                    "owner",
                    "status",
                    "notes",
                )
            },
        ),
        (
            "API Key",
            {
                "fields": ("key_help", "key_prefix", "key_hash"),
                "description": (
                    "La clave completa solo se muestra una vez al guardar un cliente "
                    "nuevo o al rotar la key."
                ),
            },
        ),
        (
            "Monitoreo",
            {"fields": ("request_count", "last_used_at", "created_at", "updated_at")},
        ),
    )

    @admin.display(description="Ayuda")
    def key_help(self, obj):
        if obj and obj.key_prefix:
            return format_html(
                "Key identificada como <code>{}…</code>. "
                "Usa la acción <strong>Rotar API Key</strong> para generar una nueva.",
                obj.key_prefix,
            )
        return "Al guardar por primera vez se generará una API Key automáticamente."

    def save_model(self, request, obj, form, change):
        creating = obj.pk is None
        super().save_model(request, obj, form, change)
        if creating or not obj.key_hash:
            raw = obj.assign_new_key()
            if obj.status == IntegrationClient.Status.PENDING:
                obj.activate()
            messages.warning(
                request,
                (
                    f"API Key generada para «{obj.name}». Cópiala ahora; "
                    f"no se volverá a mostrar: {raw}"
                ),
            )

    @admin.action(description="Activar clientes seleccionados")
    def activate_clients(self, request, queryset):
        updated = queryset.update(status=IntegrationClient.Status.ACTIVE)
        self.message_user(request, f"{updated} cliente(s) activado(s).")

    @admin.action(description="Revocar clientes seleccionados")
    def revoke_clients(self, request, queryset):
        updated = queryset.update(status=IntegrationClient.Status.REVOKED)
        self.message_user(request, f"{updated} cliente(s) revocado(s).", level=messages.WARNING)

    @admin.action(description="Rotar API Key (mostrar valor una vez)")
    def rotate_api_keys(self, request, queryset):
        for client in queryset:
            raw = client.assign_new_key()
            if client.status != IntegrationClient.Status.ACTIVE:
                client.activate()
            messages.warning(
                request,
                f"Nueva API Key para «{client.name}»: {raw}",
            )


@admin.register(IpSecurityAlert)
class IpSecurityAlertAdmin(admin.ModelAdmin):
    list_display = ("kind", "severity", "message", "ip_address", "user", "is_resolved", "created_at")
    list_filter = ("kind", "severity", "is_resolved")
    search_fields = ("message", "ip_address", "user__email")
    readonly_fields = ("created_at",)
