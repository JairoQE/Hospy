from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reviews", "0002_review_booking"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="category_ratings",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
