from django.contrib import admin

from .models import (
    Accommodation,
    AccommodationFAQ,
    AccommodationOffer,
    AccommodationPhoto,
    BrowseTile,
    Service,
)


@admin.register(BrowseTile)
class BrowseTileAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "filter_value", "order", "is_active")
    list_filter = ("group", "is_active")
    search_fields = ("title", "slug", "filter_value")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(AccommodationOffer)
class AccommodationOfferAdmin(admin.ModelAdmin):
    list_display = (
        "accommodation",
        "discount_percent",
        "start_date",
        "end_date",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("accommodation__name", "title")
    readonly_fields = ("end_date", "created_at", "updated_at")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


class AccommodationPhotoInline(admin.TabularInline):
    model = AccommodationPhoto
    extra = 0


class AccommodationFAQInline(admin.TabularInline):
    model = AccommodationFAQ
    extra = 0


@admin.register(Accommodation)
class AccommodationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "city",
        "status",
        "is_active",
        "owner",
        "average_rating",
    )
    list_filter = ("type", "status", "city", "is_active", "is_deleted")
    search_fields = ("name", "city", "address", "owner__email")
    readonly_fields = ("created_at", "updated_at", "average_rating")
    inlines = [AccommodationPhotoInline, AccommodationFAQInline]
    actions = ["aprobar_hospedajes", "rechazar_hospedajes"]

    @admin.action(description="Aprobar hospedajes seleccionados")
    def aprobar_hospedajes(self, request, queryset):
        queryset.update(
            status=Accommodation.Status.APROBADO, rejection_reason="", is_active=True
        )

    @admin.action(description="Rechazar hospedajes seleccionados")
    def rechazar_hospedajes(self, request, queryset):
        queryset.update(
            status=Accommodation.Status.RECHAZADO,
            rejection_reason="Rechazado desde el panel de administración.",
        )
