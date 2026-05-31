from django.contrib import admin

from .models import SiteDesignSettings


@admin.register(SiteDesignSettings)
class SiteDesignSettingsAdmin(admin.ModelAdmin):
    list_display = ("primary_color", "accent_color", "border_radius", "updated_at")
