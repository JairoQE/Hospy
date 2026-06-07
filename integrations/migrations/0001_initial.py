# Generated manually for integrations app

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
            name="IpSecurityAlert",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("payment_risk", "Riesgo en pago"),
                            ("account_anomaly", "Anomalía de cuenta"),
                            ("owner_mismatch", "Propietario vs ubicación"),
                            ("registration_abuse", "Abuso de registro"),
                            ("admin_hosting", "Admin desde hosting"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[("low", "Baja"), ("medium", "Media"), ("high", "Alta")],
                        db_index=True,
                        default="medium",
                        max_length=16,
                    ),
                ),
                ("message", models.CharField(max_length=500)),
                ("ip_address", models.GenericIPAddressField(blank=True, db_index=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_resolved", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ip_security_alerts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "alerta de seguridad IP",
                "verbose_name_plural": "alertas de seguridad IP",
                "ordering": ("-created_at", "-id"),
            },
        ),
        migrations.AddIndex(
            model_name="ipsecurityalert",
            index=models.Index(fields=["-created_at", "severity"], name="integratio_created_8a1f2d_idx"),
        ),
        migrations.AddIndex(
            model_name="ipsecurityalert",
            index=models.Index(fields=["kind", "-created_at"], name="integratio_kind_4c9e81_idx"),
        ),
    ]
