from django.db import migrations


TOURIST_PLACES = [
    {
        "title": "Machu Picchu",
        "slug": "machu-picchu",
        "filter_value": "machu-picchu",
        "subtitle": "Cusco · maravilla del mundo",
        "latitude": "-13.163100",
        "longitude": "-72.545000",
        "gradient_css": "linear-gradient(135deg, #14532d 0%, #22c55e 100%)",
        "order": 1,
    },
    {
        "title": "Plaza de Armas de Cusco",
        "slug": "plaza-armas-cusco",
        "filter_value": "plaza-armas-cusco",
        "subtitle": "Corazón histórico del Cusco",
        "latitude": "-13.516700",
        "longitude": "-71.978800",
        "gradient_css": "linear-gradient(135deg, #7c2d12 0%, #f59e0b 100%)",
        "order": 2,
    },
    {
        "title": "Centro Histórico de Lima",
        "slug": "centro-historico-lima",
        "filter_value": "centro-historico-lima",
        "subtitle": "Lima · patrimonio UNESCO",
        "latitude": "-12.046400",
        "longitude": "-77.042800",
        "gradient_css": "linear-gradient(135deg, #1e3a8a 0%, #38bdf8 100%)",
        "order": 3,
    },
    {
        "title": "Miraflores · Malecón",
        "slug": "miraflores-malecon",
        "filter_value": "miraflores-malecon",
        "subtitle": "Lima · acantilados y Costa Verde",
        "latitude": "-12.126900",
        "longitude": "-77.036500",
        "gradient_css": "linear-gradient(135deg, #0e7490 0%, #67e8f9 100%)",
        "order": 4,
    },
    {
        "title": "Valle del Colca",
        "slug": "valle-del-colca",
        "filter_value": "valle-del-colca",
        "subtitle": "Arequipa · cañón y cóndores",
        "latitude": "-15.605600",
        "longitude": "-71.759400",
        "gradient_css": "linear-gradient(135deg, #713f12 0%, #fbbf24 100%)",
        "order": 5,
    },
    {
        "title": "Plaza de Armas de Arequipa",
        "slug": "plaza-armas-arequipa",
        "filter_value": "plaza-armas-arequipa",
        "subtitle": "Ciudad Blanca",
        "latitude": "-16.398800",
        "longitude": "-71.536900",
        "gradient_css": "linear-gradient(135deg, #44403c 0%, #a8a29e 100%)",
        "order": 6,
    },
    {
        "title": "Lago Titicaca",
        "slug": "lago-titicaca",
        "filter_value": "lago-titicaca",
        "subtitle": "Puno · islas y cultura aimara",
        "latitude": "-15.840200",
        "longitude": "-69.967300",
        "gradient_css": "linear-gradient(135deg, #1e40af 0%, #60a5fa 100%)",
        "order": 7,
    },
    {
        "title": "Huacachina",
        "slug": "huacachina",
        "filter_value": "huacachina",
        "subtitle": "Ica · oasis en el desierto",
        "latitude": "-14.087500",
        "longitude": "-75.762900",
        "gradient_css": "linear-gradient(135deg, #92400e 0%, #fcd34d 100%)",
        "order": 8,
    },
]


def seed_places(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    for row in TOURIST_PLACES:
        BrowseTile.objects.update_or_create(
            group="lugar_turistico",
            slug=row["slug"],
            defaults={
                "title": row["title"],
                "subtitle": row["subtitle"],
                "filter_value": row["filter_value"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "gradient_css": row["gradient_css"],
                "order": row["order"],
                "is_active": True,
            },
        )


def unseed_places(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.filter(group="lugar_turistico").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0017_browse_tile_tourist_place"),
    ]

    operations = [
        migrations.RunPython(seed_places, unseed_places),
    ]
