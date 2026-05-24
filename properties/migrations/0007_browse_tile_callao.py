from django.db import migrations


def seed_callao(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    if BrowseTile.objects.filter(group="departamento", slug="callao").exists():
        return
    BrowseTile.objects.create(
        group="departamento",
        title="Callao",
        slug="callao",
        filter_value="Callao",
        gradient_css="linear-gradient(135deg, #37474f 0%, #90a4ae 100%)",
        order=7,
    )


def unseed(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.filter(group="departamento", slug="callao").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0006_seed_all_departamentos_browse"),
    ]

    operations = [
        migrations.RunPython(seed_callao, unseed),
    ]
