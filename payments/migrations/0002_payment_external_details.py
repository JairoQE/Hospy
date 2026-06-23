from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="external_operation_number",
            field=models.CharField(
                blank=True,
                help_text="Referencia que reporta el huésped al registrar pago directo.",
                max_length=64,
                verbose_name="número de operación (pago directo)",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="guest_reported_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Importe que el huésped indica haber pagado fuera de la pasarela.",
                max_digits=10,
                null=True,
                verbose_name="monto reportado por huésped",
            ),
        ),
    ]
