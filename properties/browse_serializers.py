from rest_framework import serializers

from .images import normalize_uploaded_image
from .media_urls import media_public_path
from .models import Accommodation, BrowseTile


class BrowseTilePublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BrowseTile
        fields = (
            "id",
            "group",
            "title",
            "subtitle",
            "slug",
            "filter_value",
            "image_url",
            "gradient_css",
            "latitude",
            "longitude",
            "order",
        )

    def get_image_url(self, obj):
        return media_public_path(obj.image) if obj.image else None


class BrowseTileAdminSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    clicks_30d = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = BrowseTile
        fields = (
            "id",
            "group",
            "title",
            "subtitle",
            "slug",
            "filter_value",
            "image",
            "image_url",
            "gradient_css",
            "latitude",
            "longitude",
            "order",
            "is_active",
            "clicks_30d",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "image_url", "clicks_30d")

    def get_image_url(self, obj):
        return media_public_path(obj.image) if obj.image else None

    def validate_image(self, value):
        if value:
            return normalize_uploaded_image(value)
        return value

    def validate_filter_value(self, value):
        return (value or "").strip().lower()

    def validate_is_active(self, value):
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on")
        return bool(value)

    def validate(self, data):
        group = data.get("group") or getattr(self.instance, "group", None)
        filter_value = data.get("filter_value") or getattr(
            self.instance, "filter_value", ""
        )
        if group == BrowseTile.Group.ACCOMMODATION_TYPE and filter_value:
            valid = {c[0] for c in Accommodation.Type.choices}
            if filter_value not in valid:
                raise serializers.ValidationError(
                    {
                        "filter_value": (
                            f"Para tipos use uno de: {', '.join(sorted(valid))}. "
                            "Los hospedajes deben usar el mismo código."
                        )
                    }
                )
        if group == BrowseTile.Group.NATURAL_REGION and filter_value:
            if filter_value not in ("costa", "sierra", "selva"):
                raise serializers.ValidationError(
                    {
                        "filter_value": "Para regiones use: costa, sierra o selva."
                    }
                )
        if group == BrowseTile.Group.DEPARTMENT and filter_value:
            if len(filter_value.strip()) < 2:
                raise serializers.ValidationError(
                    {
                        "filter_value": (
                            "Indique el nombre del departamento para el filtro "
                            "(ej. Lima, Cusco)."
                        )
                    }
                )
        return data
