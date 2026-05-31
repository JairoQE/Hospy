from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0011_browse_tile_casa_departamento"),
    ]

    operations = [
        migrations.CreateModel(
            name="BrowseTileClick",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "tile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="clicks",
                        to="properties.browsetile",
                    ),
                ),
            ],
            options={
                "verbose_name": "clic en bloque de inicio",
                "verbose_name_plural": "clics en bloques de inicio",
            },
        ),
        migrations.AddIndex(
            model_name="browsetileclick",
            index=models.Index(
                fields=["tile", "created_at"],
                name="properties__tile_id_8a4f2d_idx",
            ),
        ),
    ]
