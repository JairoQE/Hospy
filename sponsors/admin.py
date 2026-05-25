from django.contrib import admin

from sponsors.models import SponsorAd, SponsorAdReport


@admin.register(SponsorAd)
class SponsorAdAdmin(admin.ModelAdmin):
    list_display = ("title", "sponsor", "media_type", "status", "is_active", "duration_seconds")
    list_filter = ("status", "media_type", "is_active")
    search_fields = ("title", "sponsor__email")


@admin.register(SponsorAdReport)
class SponsorAdReportAdmin(admin.ModelAdmin):
    list_display = ("id", "ad", "reporter", "reason", "status", "created_at")
    list_filter = ("status", "reason")
