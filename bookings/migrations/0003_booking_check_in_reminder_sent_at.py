from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0002_booking_bookings_bo_room_id_3cac22_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="check_in_reminder_sent_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Cuándo se envió al propietario la alerta de check-in (1 día antes).",
                null=True,
            ),
        ),
    ]
