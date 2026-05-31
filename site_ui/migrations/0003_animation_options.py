from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_ui", "0002_sidebar_colors"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitedesignsettings",
            name="sidebar_animated",
            field=models.BooleanField(
                default=True,
                help_text="Gradiente animado del menú lateral del admin.",
            ),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="home_entrance_animated",
            field=models.BooleanField(
                default=True,
                help_text="Fade-in al cargar bloques del inicio.",
            ),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="browse_marquee_animated",
            field=models.BooleanField(
                default=True,
                help_text="Desplazamiento automático del carrusel de exploración.",
            ),
        ),
        migrations.AddField(
            model_name="sitedesignsettings",
            name="animation_speed",
            field=models.CharField(
                choices=[("slow", "Lenta"), ("normal", "Normal"), ("fast", "Rápida")],
                default="normal",
                help_text="Velocidad de los gradientes del hero y menú lateral.",
                max_length=8,
            ),
        ),
    ]
