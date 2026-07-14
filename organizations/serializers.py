from django.utils.text import slugify
from rest_framework import serializers

from properties.images import normalize_uploaded_image
from properties.media_urls import media_public_path

from .models import Organization, OrganizationMembership


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return False
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


class OrganizationSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "location",
            "logo",
            "logo_url",
            "cover",
            "cover_url",
            "ruc",
            "legal_name",
            "is_verified",
            "verified_at",
            "is_published",
            "public_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "ruc",
            "legal_name",
            "is_verified",
            "verified_at",
            "logo_url",
            "cover_url",
            "public_url",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "logo": {"required": False, "allow_null": True},
            "cover": {"required": False, "allow_null": True},
            "slug": {"required": False, "allow_blank": True},
        }

    def get_logo_url(self, obj):
        return media_public_path(obj.logo) if obj.logo else None

    def get_cover_url(self, obj):
        return media_public_path(obj.cover) if obj.cover else None

    def get_public_url(self, obj):
        return f"/empresa/{obj.slug}" if obj.slug else None

    def validate_name(self, value):
        name = (value or "").strip()
        if len(name) < 2:
            raise serializers.ValidationError("Indica un nombre comercial.")
        return name

    def validate_description(self, value):
        return (value or "").strip()[:2000]

    def validate_location(self, value):
        return (value or "").strip()[:200]

    def validate_slug(self, value):
        value = (value or "").strip()
        if not value:
            return value
        slug = slugify(value)
        if not slug:
            raise serializers.ValidationError("Slug inválido.")
        qs = Organization.objects.filter(slug=slug)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ese slug ya está en uso.")
        return slug

    def validate_is_published(self, value):
        return _coerce_bool(value)

    def validate_logo(self, value):
        if value:
            return normalize_uploaded_image(value)
        return value

    def validate_cover(self, value):
        if value:
            return normalize_uploaded_image(value)
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        org = Organization.objects.create(created_by=user, **validated_data)
        OrganizationMembership.objects.create(
            organization=org,
            user=user,
            role=OrganizationMembership.Role.TITULAR,
        )
        return org


class OrganizationPublicSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    accommodations = serializers.SerializerMethodField()
    accommodations_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    titular = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "location",
            "logo_url",
            "cover_url",
            "legal_name",
            "is_verified",
            "verified_at",
            "accommodations",
            "accommodations_count",
            "average_rating",
            "reviews_count",
            "titular",
        )

    def get_logo_url(self, obj):
        return media_public_path(obj.logo) if obj.logo else None

    def get_cover_url(self, obj):
        return media_public_path(obj.cover) if obj.cover else None

    def _stats(self, obj):
        if not hasattr(obj, "_org_stats_cache"):
            from properties.owner_stats import get_owner_public_stats

            obj._org_stats_cache = get_owner_public_stats(obj.created_by_id)
        return obj._org_stats_cache

    def get_accommodations(self, obj):
        from properties.owner_stats import owner_public_accommodations
        from properties.serializers import OwnerStoreAccommodationSerializer

        qs = owner_public_accommodations(obj.created_by_id)
        return OwnerStoreAccommodationSerializer(
            qs, many=True, context=self.context
        ).data

    def get_accommodations_count(self, obj):
        return self._stats(obj)["accommodations_count"]

    def get_average_rating(self, obj):
        return self._stats(obj)["average_rating"]

    def get_reviews_count(self, obj):
        return self._stats(obj)["reviews_count"]

    def get_titular(self, obj):
        user = obj.created_by
        return {
            "id": user.pk,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "is_identity_verified": bool(getattr(user, "is_identity_verified", False)),
        }
