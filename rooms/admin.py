from django.contrib import admin

from .models import Room, RoomAvailability, SeasonRate


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "accommodation",
        "type",
        "capacity",
        "base_price",
        "is_active",
    )
    list_filter = ("type", "is_active")


@admin.register(SeasonRate)
class SeasonRateAdmin(admin.ModelAdmin):
    list_display = ("room", "season", "price_per_night", "start_date", "end_date")


@admin.register(RoomAvailability)
class RoomAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("room", "date", "is_available", "reason")
    list_filter = ("is_available", "date")
