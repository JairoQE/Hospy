from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "guest",
        "amount",
        "method",
        "status",
        "gateway",
        "paid_at",
    )
    list_filter = ("status", "method", "gateway")
    search_fields = ("booking__id", "guest__email", "gateway_charge_id")
    readonly_fields = (
        "booking",
        "guest",
        "amount",
        "currency",
        "gateway_charge_id",
        "gateway_order_id",
        "paid_at",
        "created_at",
        "updated_at",
    )
