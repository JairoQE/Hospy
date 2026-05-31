# Generated manually for extended chart styles

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0004_chart_style"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitedesignsettings",
            name="chart_style",
            field=models.CharField(
                choices=[
                    ("basic", "Básico"),
                    ("soft", "Suave"),
                    ("stroke", "Trazos"),
                    ("three_d", "3D"),
                    ("neon", "Neón"),
                    ("glass", "Cristal"),
                    ("minimal_eco", "Minimal Eco"),
                    ("high_contrast", "Alto contraste"),
                    ("pastel_dreams", "Pastel Dreams"),
                    ("monochrome_pro", "Monochrome Pro"),
                ],
                default="basic",
                help_text="Estilo visual de gráficos en paneles admin y propietario.",
                max_length=20,
            ),
        ),
    ]
