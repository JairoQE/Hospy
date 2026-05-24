from django.contrib import admin

from .models import InboxItem


@admin.register(InboxItem)
class InboxItemAdmin(admin.ModelAdmin):
    list_display = ("title", "channel", "recipient", "is_read", "created_at")
    list_filter = ("channel", "is_read", "kind")
    search_fields = ("title", "recipient__email")
