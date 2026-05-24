from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0002_messagereport"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="guest_last_read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="conversation",
            name="owner_last_read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
