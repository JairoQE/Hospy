from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_sponsor_warning"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="cover_photo",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="usuarios/portadas/",
                verbose_name="foto de portada",
            ),
        ),
    ]
