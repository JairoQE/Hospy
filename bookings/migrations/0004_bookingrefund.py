import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0003_booking_check_in_reminder_sent_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingRefund",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente de reembolso"),
                            ("reportado", "Reembolso reportado por anfitrión"),
                            ("confirmado", "Confirmado por huésped"),
                            ("disputado", "Reportado al administrador"),
                            ("no_aplica", "Sin reembolso"),
                        ],
                        default="pendiente",
                        max_length=20,
                    ),
                ),
                (
                    "refund_percent",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                (
                    "refund_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                (
                    "due_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Fecha límite para que el anfitrión registre el reembolso.",
                        null=True,
                    ),
                ),
                (
                    "owner_operation_number",
                    models.CharField(blank=True, max_length=64),
                ),
                (
                    "owner_reported_amount",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("owner_reported_at", models.DateTimeField(blank=True, null=True)),
                ("guest_confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("dispute_notes", models.TextField(blank=True)),
                ("disputed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "booking",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="refund",
                        to="bookings.booking",
                    ),
                ),
            ],
            options={
                "verbose_name": "reembolso de reserva",
                "verbose_name_plural": "reembolsos de reservas",
                "ordering": ("-created_at",),
            },
        ),
    ]
