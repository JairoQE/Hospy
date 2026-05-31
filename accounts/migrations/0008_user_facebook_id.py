from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_user_google_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="facebook_id",
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
                unique=True,
                verbose_name="ID de Facebook",
            ),
        ),
    ]
