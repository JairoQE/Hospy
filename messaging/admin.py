from django.contrib import admin

from .models import Conversation, Message, MessageReport


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("sender", "body", "created_at")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "accommodation", "guest", "owner", "last_message_at")
    list_filter = ("created_at",)
    search_fields = ("guest__email", "owner__email", "accommodation__name")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at")
    search_fields = ("body", "sender__email")


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "message",
        "reporter",
        "reason",
        "status",
        "created_at",
    )
    list_filter = ("status", "reason")
    search_fields = ("detail", "message__body", "reporter__email")
