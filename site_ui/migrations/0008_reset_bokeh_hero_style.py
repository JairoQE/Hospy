from django.db import migrations


def forwards(apps, schema_editor):
    SiteDesignSettings = apps.get_model("site_ui", "SiteDesignSettings")
    SiteDesignSettings.objects.filter(hero_animation_style="bokeh").update(
        hero_animation_style="gradient_shift"
    )


def backwards(apps, schema_editor):
    # No restauramos bokeh automáticamente.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("site_ui", "0007_hero_animation_style"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
