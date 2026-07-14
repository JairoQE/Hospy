from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_user_is_developer"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="identity_document_number",
            field=models.CharField(
                blank=True,
                help_text="Documento usado en la verificación de identidad.",
                max_length=12,
                verbose_name="DNI verificado",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="identity_full_name",
            field=models.CharField(
                blank=True, max_length=200, verbose_name="nombre según RENIEC"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="identity_verified_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="fecha de verificación de identidad"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="is_identity_verified",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Verificación opcional vía DNI/Factiliza. "
                    "Da beneficios, no bloquea funciones."
                ),
                verbose_name="identidad verificada (RENIEC)",
            ),
        ),
    ]
