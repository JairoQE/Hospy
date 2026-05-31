from django.db import migrations


def seed_casa_departamento_tile(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.get_or_create(
        slug="casas-departamentos",
        defaults={
            "group": "tipo",
            "title": "Casas y departamentos",
            "subtitle": "Espacio completo para familias o grupos",
            "filter_value": "casa_departamento",
            "gradient_css": "linear-gradient(135deg, #37474f 0%, #78909c 100%)",
            "order": 4,
            "is_active": True,
        },
    )


def unseed(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.filter(slug="casas-departamentos").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0010_offer_rooms"),
    ]

    operations = [
        migrations.RunPython(seed_casa_departamento_tile, unseed),
    ]
