from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "guest",
        "room",
        "check_in",
        "check_out",
        "total_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "check_in", "room__accommodation")
    search_fields = ("guest__email", "room__accommodation__name", "room__number")
    raw_id_fields = ("guest", "room")
