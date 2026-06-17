from datetime import time

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0012_browse_tile_click"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodation",
            name="check_in_from",
            field=models.TimeField(
                default=time(13, 0),
                help_text="Hora estándar de entrada (política Hospy por defecto 13:00).",
                verbose_name="check-in desde",
            ),
        ),
        migrations.AddField(
            model_name="accommodation",
            name="check_out_until",
            field=models.TimeField(
                default=time(11, 0),
                help_text="Hora estándar de salida (política Hospy por defecto 11:00).",
                verbose_name="check-out hasta",
            ),
        ),
    ]
