from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0010_offer_rooms"),
        ("rooms", "0002_roomphoto"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="services",
            field=models.ManyToManyField(
                blank=True,
                help_text="Servicios incluidos en esta habitación (ej. jacuzzi, minibar).",
                related_name="habitaciones",
                to="properties.service",
            ),
        ),
    ]
