from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_user_facebook_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="payout_bank_cci",
            field=models.CharField(
                blank=True,
                help_text="Código de cuenta interbancario, alternativa a Mercado Pago.",
                max_length=20,
                verbose_name="CCI (opcional)",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="payout_document_number",
            field=models.CharField(
                blank=True,
                help_text="Documento de identidad del titular de la cuenta de cobro.",
                max_length=12,
                verbose_name="DNI para cobros",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="payout_mp_email",
            field=models.EmailField(
                blank=True,
                help_text="Correo de la cuenta Mercado Pago donde recibirás los pagos.",
                max_length=254,
                verbose_name="correo Mercado Pago",
            ),
        ),
    ]
