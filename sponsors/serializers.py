from django.contrib.auth import get_user_model
from properties.media_urls import media_public_path
from rest_framework import serializers

from accounts.serializers import RegisterSerializer
from sponsors.media_validation import validate_duration_seconds, validate_sponsor_media
from sponsors.models import SponsorAd, SponsorAdReport

User = get_user_model()


class RegisterPatrocinadorSerializer(RegisterSerializer):
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(
            **validated_data,
            role=User.Role.PATROCINADOR,
            sponsor_status=User.SponsorStatus.PENDIENTE,
        )
        user.set_password(password)
        user.save()
        return user


class SponsorApprovalSerializer(serializers.Serializer):
    aprobado = serializers.BooleanField(default=True)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if not data.get("aprobado", True) and not data.get("motivo", "").strip():
            raise serializers.ValidationError(
                {"motivo": "Indica el motivo del rechazo."}
            )
        return data


class SponsorAdSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()
    sponsor_name = serializers.SerializerMethodField()

    class Meta:
        model = SponsorAd
        fields = (
            "id",
            "title",
            "link_url",
            "media",
            "media_url",
            "media_type",
            "duration_seconds",
            "status",
            "rejection_reason",
            "takedown_reason",
            "is_active",
            "display_order",
            "sponsor",
            "sponsor_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "rejection_reason",
            "takedown_reason",
            "sponsor",
            "sponsor_name",
            "media_type",
            "media_url",
            "created_at",
            "updated_at",
        )

    def get_media_url(self, obj):
        return media_public_path(obj.media) if obj.media else None

    def get_sponsor_name(self, obj):
        return obj.sponsor.get_full_name() or obj.sponsor.email

    def validate_duration_seconds(self, value):
        validate_duration_seconds(value)
        return value

    def validate(self, attrs):
        media = attrs.get("media") or getattr(self.instance, "media", None)
        if media and "media" in attrs:
            attrs["media_type"] = validate_sponsor_media(attrs["media"])
        return attrs


class SponsorAdCreateSerializer(SponsorAdSerializer):
    class Meta(SponsorAdSerializer.Meta):
        read_only_fields = SponsorAdSerializer.Meta.read_only_fields + ("is_active",)


class SponsorAdPublicSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = SponsorAd
        fields = ("id", "title", "link_url", "media_url", "media_type", "duration_seconds")

    def get_media_url(self, obj):
        return media_public_path(obj.media) if obj.media else None


class SponsorAdReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=SponsorAdReport.Reason.choices)
    detail = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class SponsorAdReportAdminSerializer(serializers.ModelSerializer):
    ad_title = serializers.CharField(source="ad.title", read_only=True)
    ad_media_url = serializers.SerializerMethodField()
    sponsor_email = serializers.EmailField(source="ad.sponsor.email", read_only=True)
    sponsor_name = serializers.SerializerMethodField()
    reporter_name = serializers.SerializerMethodField()
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)

    class Meta:
        model = SponsorAdReport
        fields = (
            "id",
            "ad",
            "ad_title",
            "ad_media_url",
            "sponsor_email",
            "sponsor_name",
            "reporter_name",
            "reason",
            "reason_label",
            "detail",
            "status",
            "admin_notes",
            "warning_sent",
            "created_at",
            "reviewed_at",
        )

    def get_ad_media_url(self, obj):
        return media_public_path(obj.ad.media) if obj.ad.media else None

    def get_sponsor_name(self, obj):
        u = obj.ad.sponsor
        return u.get_full_name() or u.email

    def get_reporter_name(self, obj):
        u = obj.reporter
        return u.get_full_name() or u.email


class SponsorAdReportResolveSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(choices=("baja", "descartar"))
    warning = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    admin_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, data):
        if data["accion"] == "baja" and not data.get("warning", "").strip():
            raise serializers.ValidationError(
                {"warning": "Indica la advertencia que recibirá el patrocinador."}
            )
        return data
