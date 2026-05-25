# Generated manually for sponsor ads

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SponsorAd",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("link_url", models.URLField(blank=True)),
                ("media", models.FileField(upload_to="anuncios/")),
                (
                    "media_type",
                    models.CharField(
                        choices=[
                            ("image", "Imagen"),
                            ("gif", "GIF"),
                            ("video", "Video"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "duration_seconds",
                    models.PositiveSmallIntegerField(
                        default=5,
                        help_text="Segundos visibles en la rotación (máx. 10).",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("aprobado", "Aprobado"),
                            ("rechazado", "Rechazado"),
                        ],
                        default="pendiente",
                        max_length=20,
                    ),
                ),
                ("rejection_reason", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "sponsor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sponsor_ads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "anuncio patrocinado",
                "verbose_name_plural": "anuncios patrocinados",
                "ordering": ["display_order", "-created_at"],
            },
        ),
    ]
