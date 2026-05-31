from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0003_animation_options"),
    ]

    operations = [
        migrations.AddField(
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
                ],
                default="basic",
                help_text="Estilo visual de gráficos en paneles admin y propietario.",
                max_length=12,
            ),
        ),
    ]
