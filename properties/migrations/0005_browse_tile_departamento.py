from django.db import migrations, models


def seed_departamentos(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    if BrowseTile.objects.filter(group="departamento").exists():
        return
    rows = [
        ("lima", "Lima", "Lima", "linear-gradient(135deg, #1565c0 0%, #64b5f6 100%)", 1),
        ("cusco", "Cusco", "Cusco", "linear-gradient(135deg, #6a1b9a 0%, #ce93d8 100%)", 2),
        ("arequipa", "Arequipa", "Arequipa", "linear-gradient(135deg, #bf360c 0%, #ff8a65 100%)", 3),
        ("la-libertad", "La Libertad", "La Libertad", "linear-gradient(135deg, #00838f 0%, #4dd0e1 100%)", 4),
        ("piura", "Piura", "Piura", "linear-gradient(135deg, #f57f17 0%, #ffd54f 100%)", 5),
        ("lambayeque", "Lambayeque", "Lambayeque", "linear-gradient(135deg, #5d4037 0%, #a1887f 100%)", 6),
        ("loreto", "Loreto", "Loreto", "linear-gradient(135deg, #1b5e20 0%, #81c784 100%)", 7),
        ("san-martin", "San Martín", "San Martín", "linear-gradient(135deg, #2e7d32 0%, #aed581 100%)", 8),
        ("puno", "Puno", "Puno", "linear-gradient(135deg, #283593 0%, #9fa8da 100%)", 9),
        ("junin", "Junín", "Junín", "linear-gradient(135deg, #4e342e 0%, #bcaaa4 100%)", 10),
        ("ica", "Ica", "Ica", "linear-gradient(135deg, #e65100 0%, #ffcc80 100%)", 11),
        ("ucayali", "Ucayali", "Ucayali", "linear-gradient(135deg, #00695c 0%, #80cbc4 100%)", 12),
    ]
    for slug, title, filter_value, gradient, order in rows:
        BrowseTile.objects.create(
            group="departamento",
            title=title,
            slug=slug,
            filter_value=filter_value,
            gradient_css=gradient,
            order=order,
        )


def unseed_departamentos(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    BrowseTile.objects.filter(group="departamento").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0004_seed_browse_tiles"),
    ]

    operations = [
        migrations.AlterField(
            model_name="browsetile",
            name="filter_value",
            field=models.CharField(
                help_text=(
                    "Filtro API: tipo (hotel…), zona (costa…) o departamento "
                    "(nombre, ej. Lima)."
                ),
                max_length=80,
            ),
        ),
        migrations.AlterField(
            model_name="browsetile",
            name="group",
            field=models.CharField(
                choices=[
                    ("tipo", "Tipo de alojamiento"),
                    ("region", "Región natural"),
                    ("departamento", "Departamento"),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.RunPython(seed_departamentos, unseed_departamentos),
    ]
