from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_user_owner_warnings"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_developer",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Capacidad aditiva: puede usar la API de integración "
                    "sin cambiar su rol principal."
                ),
                verbose_name="acceso desarrollador API",
            ),
        ),
    ]
