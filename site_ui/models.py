from django.db import models


class SiteDesignSettings(models.Model):
    """Configuración global de diseño (singleton, pk=1)."""

    class BorderRadius(models.TextChoices):
        COMPACT = "sm", "Compacto (8px)"
        DEFAULT = "md", "Estándar (12px)"
        ROUND = "lg", "Redondeado (16px)"

    primary_color = models.CharField(max_length=7, default="#0d6e6e")
    accent_color = models.CharField(max_length=7, default="#f4a261")
    hero_color_deep = models.CharField(max_length=7, default="#1e3a5f")
    hero_color_mid = models.CharField(max_length=7, default="#2c7da0")
    hero_color_green = models.CharField(max_length=7, default="#1d6b5c")
    sidebar_color_deep = models.CharField(max_length=7, default="#0f2744")
    sidebar_color_mid = models.CharField(max_length=7, default="#1a5f7a")
    sidebar_color_green = models.CharField(max_length=7, default="#0d4d4a")
    sidebar_menu_accent = models.CharField(max_length=7, default="#f4a261")
    sidebar_sync_hero = models.BooleanField(
        default=True,
        help_text="Si es True, el menú lateral usa los mismos tonos del hero.",
    )
    hero_animated = models.BooleanField(default=True)
    sidebar_animated = models.BooleanField(
        default=True,
        help_text="Gradiente animado del menú lateral del admin.",
    )
    home_entrance_animated = models.BooleanField(
        default=True,
        help_text="Fade-in al cargar bloques del inicio.",
    )
    browse_marquee_animated = models.BooleanField(
        default=True,
        help_text="Desplazamiento automático del carrusel de exploración.",
    )

    class AnimationSpeed(models.TextChoices):
        SLOW = "slow", "Lenta"
        NORMAL = "normal", "Normal"
        FAST = "fast", "Rápida"

    animation_speed = models.CharField(
        max_length=8,
        choices=AnimationSpeed.choices,
        default=AnimationSpeed.NORMAL,
        help_text="Velocidad de los gradientes del hero y menú lateral.",
    )
    border_radius = models.CharField(
        max_length=4,
        choices=BorderRadius.choices,
        default=BorderRadius.DEFAULT,
    )

    class ChartStyle(models.TextChoices):
        FLAT = "flat_professional", "Flat Professional"
        GLASS = "glassmorphism", "Glassmorphism"
        NEON = "neon_cyber", "Neon Cyber"
        LINES = "minimalist_lines", "Minimalist Lines"
        PASTEL = "pastel_dreams", "Pastel Dreams"
        CONTRAST = "high_contrast", "High Contrast"
        THREE_D = "three_d_extruded", "3D Extruded"
        MONO = "monochrome_gradient", "Monochrome Gradient"
        HAND = "hand_drawn", "Hand Drawn"
        RETRO = "retro_terminal", "Retro Terminal"

    chart_style = models.CharField(
        max_length=24,
        choices=ChartStyle.choices,
        default=ChartStyle.FLAT,
        help_text="Estilo visual de gráficos en paneles admin y propietario.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "configuración de diseño"
        verbose_name_plural = "configuración de diseño"

    def __str__(self):
        return "Diseño de la interfaz Hospy"

    @classmethod
    def load(cls) -> "SiteDesignSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
