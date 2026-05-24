import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InboxItem",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("notificacion", "Notificación"),
                            ("mensaje", "Mensaje"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(blank=True)),
                ("link", models.CharField(blank=True, max_length=255)),
                ("kind", models.CharField(blank=True, db_index=True, max_length=50)),
                ("is_read", models.BooleanField(db_index=True, default=False)),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inbox_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "sender",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_inbox_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "elemento de bandeja",
                "verbose_name_plural": "elementos de bandeja",
                "ordering": ("-created_at",),
                "indexes": [
                    models.Index(
                        fields=["recipient", "channel", "is_read", "-created_at"],
                        name="notificatio_recipie_0e8f0d_idx",
                    )
                ],
            },
        ),
    ]
