from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0013_accommodation_check_policies"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodation",
            name="check_in_instructions",
            field=models.TextField(
                blank=True,
                help_text="Texto visible en la ficha: cómo llegar, recepción, llaves, etc.",
                max_length=2000,
                verbose_name="instrucciones de check-in",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="check_out_instructions",
            field=models.TextField(
                blank=True,
                help_text="Texto visible en la ficha: horario de salida, entrega de llaves, etc.",
                max_length=2000,
                verbose_name="instrucciones de check-out",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="cancellation_policy_notes",
            field=models.TextField(
                blank=True,
                help_text="Condiciones propias del anfitrión (complementa las reglas de Hospy).",
                max_length=2000,
                verbose_name="política de cancelación del local",
            ),
        ),
    ]
