# Generated manually — reportes y baja de anuncios

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def publish_pending_ads(apps, schema_editor):
    SponsorAd = apps.get_model("sponsors", "SponsorAd")
    SponsorAd.objects.filter(status="pendiente").update(status="aprobado", is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ("sponsors", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="sponsorad",
            name="takedown_reason",
            field=models.TextField(
                blank=True,
                help_text="Motivo de baja por reporte de usuarios o administrador.",
            ),
        ),
        migrations.AlterField(
            model_name="sponsorad",
            name="status",
            field=models.CharField(
                choices=[
                    ("pendiente", "Pendiente"),
                    ("aprobado", "Aprobado"),
                    ("rechazado", "Rechazado"),
                    ("baja", "Dado de baja"),
                ],
                default="pendiente",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="SponsorAdReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.CharField(choices=[("inapropiado", "Contenido inapropiado"), ("enganoso", "Engañoso o falso"), ("spam", "Spam"), ("otro", "Otro")], max_length=20)),
                ("detail", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("pendiente", "Pendiente"), ("resuelto", "Resuelto"), ("descartado", "Descartado")], default="pendiente", max_length=20)),
                ("admin_notes", models.TextField(blank=True)),
                ("warning_sent", models.TextField(blank=True, help_text="Advertencia enviada al patrocinador al dar de baja el anuncio.")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "ad",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="sponsors.sponsorad"),
                ),
                (
                    "reporter",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sponsor_ad_reports_filed", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sponsor_ad_reports_reviewed", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "reporte de anuncio",
                "verbose_name_plural": "reportes de anuncios",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="sponsoradreport",
            constraint=models.UniqueConstraint(fields=("ad", "reporter"), name="sponsors_unique_report_per_user"),
        ),
        migrations.RunPython(publish_pending_ads, migrations.RunPython.noop),
    ]
