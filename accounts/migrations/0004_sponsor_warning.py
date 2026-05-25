# Generated manually — advertencias a patrocinadores

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_sponsor_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="sponsor_warning_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="sponsor_warning_message",
            field=models.TextField(blank=True, verbose_name="última advertencia (patrocinador)"),
        ),
    ]
