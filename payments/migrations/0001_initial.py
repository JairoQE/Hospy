# Generated manually for payments app

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("bookings", "0002_booking_bookings_bo_room_id_3cac22_idx_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
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
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("currency", models.CharField(default="PEN", max_length=3)),
                (
                    "method",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("yape", "Yape"),
                            ("card", "Tarjeta"),
                            ("pagoefectivo", "PagoEfectivo"),
                            ("plin", "Plin"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("procesando", "Procesando"),
                            ("pagado", "Pagado"),
                            ("fallido", "Fallido"),
                            ("expirado", "Expirado"),
                            ("cancelado", "Cancelado"),
                        ],
                        default="pendiente",
                        max_length=20,
                    ),
                ),
                ("gateway", models.CharField(default="mock", max_length=32)),
                ("gateway_charge_id", models.CharField(blank=True, max_length=128)),
                ("gateway_order_id", models.CharField(blank=True, max_length=128)),
                ("failure_message", models.CharField(blank=True, max_length=255)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "booking",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payment",
                        to="bookings.booking",
                    ),
                ),
                (
                    "guest",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pagos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "pago",
                "verbose_name_plural": "pagos",
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(
                fields=["guest", "status"], name="payments_pa_guest_i_6f0d0d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(
                fields=["status", "expires_at"], name="payments_pa_status_0a8f2b_idx"
            ),
        ),
    ]
