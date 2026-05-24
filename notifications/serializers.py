from rest_framework import serializers

from properties.media_urls import media_public_path

from .models import InboxItem


class InboxItemSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_photo_url = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()
    accommodation_id = serializers.SerializerMethodField()
    accommodation_name = serializers.SerializerMethodField()
    thread_at = serializers.SerializerMethodField()

    class Meta:
        model = InboxItem
        fields = (
            "id",
            "channel",
            "title",
            "body",
            "link",
            "kind",
            "is_read",
            "sender_name",
            "sender_photo_url",
            "conversation_id",
            "accommodation_id",
            "accommodation_name",
            "thread_at",
            "created_at",
            "updated_at",
        )

    def get_sender_name(self, obj):
        if not obj.sender_id:
            return None
        u = obj.sender
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        return name or u.email.split("@", 1)[0]

    def get_sender_photo_url(self, obj):
        if not obj.sender_id or not obj.sender.photo:
            return None
        return media_public_path(obj.sender.photo)

    def get_conversation_id(self, obj):
        conv = self._get_conversation(obj)
        return conv.pk if conv else None

    def get_accommodation_id(self, obj):
        conv = self._get_conversation(obj)
        return conv.accommodation_id if conv else None

    def get_accommodation_name(self, obj):
        conv = self._get_conversation(obj)
        return conv.accommodation.name if conv else None

    def get_thread_at(self, obj):
        conv_id = self.get_conversation_id(obj)
        if not conv_id:
            return obj.created_at
        from messaging.models import Message

        last = (
            Message.objects.filter(conversation_id=conv_id)
            .order_by("-created_at")
            .values_list("created_at", flat=True)
            .first()
        )
        return last or obj.created_at

    def _get_conversation(self, obj):
        if not obj.kind or not obj.kind.startswith("chat_conv_"):
            return None
        try:
            conv_id = int(obj.kind.removeprefix("chat_conv_"))
        except ValueError:
            return None
        from messaging.models import Conversation

        return (
            Conversation.objects.select_related("accommodation")
            .filter(pk=conv_id)
            .first()
        )


class InboxSummarySerializer(serializers.Serializer):
    notificaciones = serializers.IntegerField()
    mensajes = serializers.IntegerField()
