from django.contrib import admin

from .models import Organization, OrganizationMembership


class OrganizationMembershipInline(admin.TabularInline):
    model = OrganizationMembership
    extra = 0
    autocomplete_fields = ("user",)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "ruc",
        "is_verified",
        "is_published",
        "created_by",
        "updated_at",
    )
    list_filter = ("is_verified", "is_published")
    search_fields = ("name", "slug", "ruc", "legal_name")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [OrganizationMembershipInline]
    autocomplete_fields = ("created_by",)


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("organization__name", "user__email", "user__username")
    autocomplete_fields = ("organization", "user")
