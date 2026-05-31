from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SiteDesignSettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("primary_color", models.CharField(default="#0d6e6e", max_length=7)),
                ("accent_color", models.CharField(default="#f4a261", max_length=7)),
                ("hero_color_deep", models.CharField(default="#1e3a5f", max_length=7)),
                ("hero_color_mid", models.CharField(default="#2c7da0", max_length=7)),
                ("hero_color_green", models.CharField(default="#1d6b5c", max_length=7)),
                ("hero_animated", models.BooleanField(default=True)),
                (
                    "border_radius",
                    models.CharField(
                        choices=[
                            ("sm", "Compacto (8px)"),
                            ("md", "Estándar (12px)"),
                            ("lg", "Redondeado (16px)"),
                        ],
                        default="md",
                        max_length=4,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "configuración de diseño",
                "verbose_name_plural": "configuración de diseño",
            },
        ),
    ]
