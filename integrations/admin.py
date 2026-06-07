from django.contrib import admin

from .models import IpSecurityAlert


@admin.register(IpSecurityAlert)
class IpSecurityAlertAdmin(admin.ModelAdmin):
    list_display = ("kind", "severity", "message", "ip_address", "user", "is_resolved", "created_at")
    list_filter = ("kind", "severity", "is_resolved")
    search_fields = ("message", "ip_address", "user__email")
    readonly_fields = ("created_at",)
