from django.db import migrations


def _slugify_name(nombre: str) -> str:
    slug = nombre.lower().replace(" ", "-")
    for a, b in [("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")]:
        slug = slug.replace(a, b)
    return slug[:80]


def seed_all(apps, schema_editor):
    BrowseTile = apps.get_model("properties", "BrowseTile")
    from properties.ubigeo_loader import list_departamentos

    existing_filters = set(
        BrowseTile.objects.filter(group="departamento").values_list(
            "filter_value", flat=True
        )
    )
    existing_slugs = set(
        BrowseTile.objects.filter(group="departamento").values_list("slug", flat=True)
    )
    order = BrowseTile.objects.filter(group="departamento").count()
    gradients = [
        "linear-gradient(135deg, #1565c0 0%, #64b5f6 100%)",
        "linear-gradient(135deg, #6a1b9a 0%, #ce93d8 100%)",
        "linear-gradient(135deg, #bf360c 0%, #ff8a65 100%)",
        "linear-gradient(135deg, #00838f 0%, #4dd0e1 100%)",
        "linear-gradient(135deg, #1b5e20 0%, #81c784 100%)",
        "linear-gradient(135deg, #f57f17 0%, #ffd54f 100%)",
    ]
    for depto in list_departamentos():
        nombre = depto["nombre"]
        slug = _slugify_name(nombre)
        if nombre in existing_filters or slug in existing_slugs:
            continue
        order += 1
        BrowseTile.objects.create(
            group="departamento",
            title=nombre,
            slug=slug,
            filter_value=nombre,
            gradient_css=gradients[order % len(gradients)],
            order=order,
        )


def unseed(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0005_browse_tile_departamento"),
    ]

    operations = [
        migrations.RunPython(seed_all, unseed),
    ]
