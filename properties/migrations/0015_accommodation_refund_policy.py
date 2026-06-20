from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0014_accommodation_owner_policies"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodation",
            name="refund_policy_type",
            field=models.CharField(
                choices=[
                    ("flexible", "Flexible"),
                    ("moderate", "Moderada"),
                    ("strict", "Estricta"),
                    ("non_refundable", "No reembolsable"),
                    ("custom", "Personalizada"),
                ],
                default="flexible",
                max_length=20,
                verbose_name="tipo de reembolso",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="refund_hours_before_full",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Solo política flexible. Vacío = 48 h (estándar Hospy).",
                null=True,
                verbose_name="horas para reembolso completo",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="refund_policy_notes",
            field=models.TextField(
                blank=True,
                help_text="Texto libre; obligatorio recomendado si el tipo es Personalizada.",
                max_length=2000,
                verbose_name="detalle de reembolso",
            ),
        ),
    ]
