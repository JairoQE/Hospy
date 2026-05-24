from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "username",
        "role",
        "owner_status",
        "is_staff",
        "is_active",
    )
    list_filter = ("role", "owner_status", "is_staff", "is_active")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Hospy",
            {
                "fields": (
                    "role",
                    "owner_status",
                    "owner_rejection_reason",
                    "phone",
                    "photo",
                )
            },
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Hospy", {"fields": ("role", "phone")}),
    )
