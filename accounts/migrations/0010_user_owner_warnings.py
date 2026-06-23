from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_owner_payout_profile"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="owner_strikes",
            field=models.PositiveSmallIntegerField(
                default=0, verbose_name="amonestaciones por reembolsos"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="owner_warning_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="owner_warning_message",
            field=models.TextField(blank=True, verbose_name="última advertencia (propietario)"),
        ),
    ]
