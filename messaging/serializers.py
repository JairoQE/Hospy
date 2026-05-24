from rest_framework import serializers

from accounts.models import User
from properties.media_urls import media_public_path

from .models import Conversation, Message, MessageReport


def user_photo_url(user: User) -> str | None:
    return media_public_path(user.photo) if user.photo else None


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_photo_url = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    seen_at = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "sender",
            "sender_name",
            "sender_photo_url",
            "body",
            "is_mine",
            "seen_at",
            "created_at",
        )
        read_only_fields = fields

    def get_sender_name(self, obj):
        return _display_name(obj.sender)

    def get_sender_photo_url(self, obj):
        return user_photo_url(obj.sender)

    def get_is_mine(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.sender_id == request.user.id

    def get_seen_at(self, obj):
        if not self.get_is_mine(obj):
            return None
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        conv = self.context.get("conversation")
        if conv is None:
            conv = getattr(obj, "conversation", None)
        if conv is None:
            return None
        if request.user.id == conv.guest_id:
            peer_read = conv.owner_last_read_at
        elif request.user.id == conv.owner_id:
            peer_read = conv.guest_last_read_at
        else:
            return None
        if peer_read and peer_read >= obj.created_at:
            return peer_read
        return None


class ConversationSerializer(serializers.ModelSerializer):
    accommodation_name = serializers.CharField(
        source="accommodation.name", read_only=True
    )
    guest_name = serializers.SerializerMethodField()
    guest_photo_url = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_photo_url = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "accommodation",
            "accommodation_name",
            "guest",
            "guest_name",
            "guest_photo_url",
            "owner",
            "owner_name",
            "owner_photo_url",
            "last_message_at",
            "last_message_preview",
            "created_at",
        )
        read_only_fields = fields

    def get_guest_name(self, obj):
        return _display_name(obj.guest)

    def get_guest_photo_url(self, obj):
        return user_photo_url(obj.guest)

    def get_owner_name(self, obj):
        return _display_name(obj.owner)

    def get_owner_photo_url(self, obj):
        return user_photo_url(obj.owner)

    def get_last_message_preview(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return ""
        return (last.body or "")[:120]


class ConversationCreateSerializer(serializers.Serializer):
    accommodation = serializers.IntegerField()

    def validate_accommodation(self, value):
        from properties.services import public_accommodations_queryset

        if not public_accommodations_queryset().filter(pk=value).exists():
            raise serializers.ValidationError("Hospedaje no disponible.")
        return value


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("Escribe un mensaje.")
        return value.strip()


def _display_name(user: User) -> str:
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return name or user.email.split("@", 1)[0]


class MessageReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=MessageReport.Reason.choices)
    detail = serializers.CharField(required=False, allow_blank=True, max_length=500)


class MessageReportResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            MessageReport.Status.REVISADO,
            MessageReport.Status.DESCARTADO,
        ]
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class MessageReportAdminSerializer(serializers.ModelSerializer):
    message_id = serializers.IntegerField(source="message.id", read_only=True)
    message_body = serializers.CharField(source="message.body", read_only=True)
    message_created_at = serializers.DateTimeField(
        source="message.created_at", read_only=True
    )
    sender_id = serializers.IntegerField(source="message.sender_id", read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.EmailField(source="message.sender.email", read_only=True)
    reporter_name = serializers.SerializerMethodField()
    reporter_email = serializers.EmailField(source="reporter.email", read_only=True)
    accommodation_id = serializers.IntegerField(
        source="message.conversation.accommodation_id", read_only=True
    )
    accommodation_name = serializers.CharField(
        source="message.conversation.accommodation.name", read_only=True
    )
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageReport
        fields = (
            "id",
            "message_id",
            "message_body",
            "message_created_at",
            "sender_id",
            "sender_name",
            "sender_email",
            "reporter_name",
            "reporter_email",
            "accommodation_id",
            "accommodation_name",
            "reason",
            "reason_label",
            "detail",
            "status",
            "status_label",
            "admin_notes",
            "reviewed_by_name",
            "created_at",
            "reviewed_at",
        )
        read_only_fields = fields

    def get_sender_name(self, obj):
        return _display_name(obj.message.sender)

    def get_reporter_name(self, obj):
        return _display_name(obj.reporter)

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by_id:
            return ""
        return _display_name(obj.reviewed_by)
