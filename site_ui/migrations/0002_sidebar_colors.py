from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_color_deep",
            field=models.CharField(default="#0f2744", max_length=7),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_color_mid",
            field=models.CharField(default="#1a5f7a", max_length=7),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_color_green",
            field=models.CharField(default="#0d4d4a", max_length=7),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_menu_accent",
            field=models.CharField(default="#f4a261", max_length=7),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_sync_hero",
            field=models.BooleanField(
                default=True,
                help_text="Si es True, el menú lateral usa los mismos tonos del hero.",
            ),
        ),
    ]
