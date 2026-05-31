# Migración a los 10 estilos oficiales v2

from django.db import migrations, models

LEGACY_MAP = {
    "basic": "flat_professional",
    "soft": "pastel_dreams",
    "stroke": "minimalist_lines",
    "three_d": "three_d_extruded",
    "neon": "neon_cyber",
    "glass": "glassmorphism",
    "minimal_eco": "flat_professional",
    "high_contrast": "high_contrast",
    "pastel_dreams": "pastel_dreams",
    "monochrome_pro": "monochrome_gradient",
}

NEW_CHOICES = [
    ("flat_professional", "Flat Professional"),
    ("glassmorphism", "Glassmorphism"),
    ("neon_cyber", "Neon Cyber"),
    ("minimalist_lines", "Minimalist Lines"),
    ("pastel_dreams", "Pastel Dreams"),
    ("high_contrast", "High Contrast"),
    ("three_d_extruded", "3D Extruded"),
    ("monochrome_gradient", "Monochrome Gradient"),
    ("hand_drawn", "Hand Drawn"),
    ("retro_terminal", "Retro Terminal"),
]


def migrate_chart_styles(apps, schema_editor):
    SiteDesignSettings = apps.get_model("site_ui", "SiteDesignSettings")
    for row in SiteDesignSettings.objects.all():
        new_style = LEGACY_MAP.get(row.chart_style, row.chart_style)
        if new_style != row.chart_style:
            row.chart_style = new_style
            row.save(update_fields=["chart_style"])


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0005_chart_style_extended"),
    ]

    operations = [
        migrations.RunPython(migrate_chart_styles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="sitedesignsettings",
            name="chart_style",
            field=models.CharField(
                choices=NEW_CHOICES,
                default="flat_professional",
                help_text="Estilo visual de gráficos en paneles admin y propietario.",
                max_length=24,
            ),
        ),
    ]
