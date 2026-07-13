# Generated manually for IntegrationClient

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="IntegrationClient",
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
                ("name", models.CharField(max_length=120, verbose_name="nombre del sistema")),
                (
                    "organization",
                    models.CharField(blank=True, max_length=120, verbose_name="organización"),
                ),
                ("contact_email", models.EmailField(max_length=254, verbose_name="correo de contacto")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("activo", "Activo"),
                            ("revocado", "Revocado"),
                        ],
                        db_index=True,
                        default="pendiente",
                        max_length=20,
                    ),
                ),
                (
                    "key_prefix",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        help_text="Solo para identificación (ej. hspy_AbCdEfGh).",
                        max_length=16,
                        verbose_name="prefijo de la key",
                    ),
                ),
                (
                    "key_hash",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=64,
                        verbose_name="hash de la API Key",
                    ),
                ),
                ("notes", models.TextField(blank=True, verbose_name="notas internas")),
                (
                    "last_used_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="último uso"),
                ),
                ("request_count", models.PositiveIntegerField(default=0, verbose_name="requests")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="integration_clients",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="usuario responsable (opcional)",
                    ),
                ),
            ],
            options={
                "verbose_name": "cliente de integración",
                "verbose_name_plural": "clientes de integración",
                "ordering": ("-created_at", "-id"),
            },
        ),
    ]
