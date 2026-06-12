from rest_framework import serializers

from .models import SiteDesignSettings


class SiteDesignSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteDesignSettings
        fields = (
            "primary_color",
            "accent_color",
            "hero_color_deep",
            "hero_color_mid",
            "hero_color_green",
            "sidebar_color_deep",
            "sidebar_color_mid",
            "sidebar_color_green",
            "sidebar_menu_accent",
            "sidebar_sync_hero",
            "hero_animated",
            "hero_animation_style",
            "sidebar_animated",
            "home_entrance_animated",
            "browse_marquee_animated",
            "animation_speed",
            "border_radius",
            "chart_style",
            "updated_at",
        )
        read_only_fields = ("updated_at",)

    def validate_primary_color(self, value):
        return _normalize_hex(value, "#0d6e6e")

    def validate_accent_color(self, value):
        return _normalize_hex(value, "#f4a261")

    def validate_hero_color_deep(self, value):
        return _normalize_hex(value, "#1e3a5f")

    def validate_hero_color_mid(self, value):
        return _normalize_hex(value, "#2c7da0")

    def validate_hero_color_green(self, value):
        return _normalize_hex(value, "#1d6b5c")

    def validate_sidebar_color_deep(self, value):
        return _normalize_hex(value, "#0f2744")

    def validate_sidebar_color_mid(self, value):
        return _normalize_hex(value, "#1a5f7a")

    def validate_sidebar_color_green(self, value):
        return _normalize_hex(value, "#0d4d4a")

    def validate_sidebar_menu_accent(self, value):
        return _normalize_hex(value, "#f4a261")


def _normalize_hex(value: str, fallback: str) -> str:
    v = (value or "").strip().lower()
    if not v.startswith("#"):
        v = f"#{v}"
    if len(v) == 7 and all(c in "0123456789abcdef" for c in v[1:]):
        return v
    return fallback
