import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0015_accommodation_refund_policy"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodation",
            name="cancel_hours_before_checkin",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Plazo del huésped para cancelar en la app. Vacío = 48 h (estándar Hospy).",
                null=True,
                verbose_name="horas mínimas antes del check-in para cancelar",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="refund_processing_days",
            field=models.PositiveSmallIntegerField(
                default=3,
                help_text="Plazo máximo (1–7 días) para que el anfitrión registre el reembolso directo.",
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(7),
                ],
                verbose_name="días para procesar reembolso tras cancelación",
            ),
        ),
    ]
