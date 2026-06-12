from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0006_chart_styles_v2"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitedesignsettings",
            name="hero_animation_style",
            field=models.CharField(
                choices=[
                    ("gradient_shift", "Gradiente deslizante"),
                    ("mesh", "Mesh gradient"),
                    ("aurora", "Aurora boreal"),
                    ("conic", "Gradiente cónico"),
                    ("radial_pulse", "Pulso radial"),
                    ("blobs", "Blobs orgánicos"),
                    ("particles", "Partículas flotantes"),
                    ("bokeh", "Bokeh"),
                    ("geo_network", "Red geográfica"),
                    ("wave_layers", "Capas de olas"),
                    ("parallax_waves", "Olas parallax"),
                    ("grain", "Grano cinematográfico"),
                    ("travel_routes", "Rutas de viaje"),
                    ("floating_pins", "Pins de ubicación"),
                    ("ken_burns", "Ken Burns"),
                    ("wave_path", "Ola del divisor animada"),
                    ("static", "Estático"),
                ],
                default="gradient_shift",
                help_text="Estilo de animación del fondo del hero en la portada.",
                max_length=24,
            ),
        ),
    ]
