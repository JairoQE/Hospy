from django.db import migrations, models
import django.db.models.deletion


def seed_price_history(apps, schema_editor):
    Room = apps.get_model("rooms", "Room")
    RoomBasePriceHistory = apps.get_model("rooms", "RoomBasePriceHistory")
    for room in Room.objects.all().iterator():
        effective_from = room.created_at.date() if room.created_at else room.updated_at.date()
        RoomBasePriceHistory.objects.get_or_create(
            room=room,
            effective_from=effective_from,
            defaults={"base_price": room.base_price},
        )


def unseed_price_history(apps, schema_editor):
    RoomBasePriceHistory = apps.get_model("rooms", "RoomBasePriceHistory")
    RoomBasePriceHistory.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0003_room_services"),
    ]

    operations = [
        migrations.CreateModel(
            name="RoomBasePriceHistory",
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
                ("base_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("effective_from", models.DateField(db_index=True)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="price_history",
                        to="rooms.room",
                    ),
                ),
            ],
            options={
                "verbose_name": "historial de precio base",
                "verbose_name_plural": "historial de precios base",
                "ordering": ("-effective_from", "-recorded_at"),
                "indexes": [
                    models.Index(
                        fields=["room", "effective_from"],
                        name="rooms_roomb_room_id_effective_idx",
                    )
                ],
            },
        ),
        migrations.RunPython(seed_price_history, unseed_price_history),
    ]
