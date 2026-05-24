from django.db import migrations


def seed(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    if BrowseTile.objects.exists():
        return
    rows = [
        {
            "group": "tipo",
            "title": "Hoteles",
            "slug": "hoteles",
            "filter_value": "hotel",
            "gradient_css": "linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)",
            "order": 1,
        },
        {
            "group": "tipo",
            "title": "Hostales",
            "slug": "hostales",
            "filter_value": "hostal",
            "gradient_css": "linear-gradient(135deg, #6a1b9a 0%, #ab47bc 100%)",
            "order": 2,
        },
        {
            "group": "tipo",
            "title": "Hospedajes",
            "slug": "hospedajes",
            "filter_value": "hospedaje",
            "gradient_css": "linear-gradient(135deg, #e65100 0%, #ffb74d 100%)",
            "order": 3,
        },
        {
            "group": "region",
            "title": "Costa",
            "subtitle": "Playas, gastronomía y ciudades costeras",
            "slug": "costa",
            "filter_value": "costa",
            "gradient_css": "linear-gradient(135deg, #0d6e6e 0%, #4db6ac 100%)",
            "order": 1,
        },
        {
            "group": "region",
            "title": "Sierra",
            "subtitle": "Montaña, cultura andina y paisajes altos",
            "slug": "sierra",
            "filter_value": "sierra",
            "gradient_css": "linear-gradient(135deg, #5c4d7a 0%, #8e7cc3 100%)",
            "order": 2,
        },
        {
            "group": "region",
            "title": "Selva",
            "subtitle": "Amazonía, naturaleza y aventura",
            "slug": "selva",
            "filter_value": "selva",
            "gradient_css": "linear-gradient(135deg, #1b5e20 0%, #66bb6a 100%)",
            "order": 3,
        },
    ]
    for row in rows:
        BrowseTile.objects.create(**row)


def unseed(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0003_browse_tile"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
