# Generated manually for patrocinador role

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_owner_approval"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="sponsor_rejection_reason",
            field=models.TextField(
                blank=True,
                verbose_name="motivo de rechazo (patrocinador)",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="sponsor_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("pendiente", "Pendiente de aprobación"),
                    ("aprobado", "Aprobado"),
                    ("rechazado", "Rechazado"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("huesped", "Huésped"),
                    ("propietario", "Propietario"),
                    ("patrocinador", "Patrocinador"),
                    ("administrador", "Administrador"),
                ],
                default="huesped",
                max_length=20,
            ),
        ),
    ]
