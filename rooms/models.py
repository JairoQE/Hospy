from django.db import models

from properties.models import Accommodation, Service, TimeStampedModel


class Room(TimeStampedModel):
    class Type(models.TextChoices):
        SIMPLE = "simple", "Simple"
        DOBLE = "doble", "Doble"
        SUITE = "suite", "Suite"
        FAMILIAR = "familiar", "Familiar"

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="habitaciones",
    )
    number = models.CharField(max_length=20)
    type = models.CharField(max_length=20, choices=Type.choices)
    capacity = models.PositiveSmallIntegerField()
    floor = models.PositiveSmallIntegerField(default=1)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    services = models.ManyToManyField(
        Service,
        related_name="habitaciones",
        blank=True,
        help_text="Servicios incluidos en esta habitación (ej. jacuzzi, minibar).",
    )

    class Meta:
        verbose_name = "habitación"
        verbose_name_plural = "habitaciones"
        unique_together = ("accommodation", "number")
        ordering = ("floor", "number")

    def __str__(self):
        return f"{self.accommodation.name} — Hab. {self.number}"


class RoomPhoto(TimeStampedModel):
    """RF-22: fotografías por habitación."""

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="fotos")
    image = models.ImageField(upload_to="habitaciones/")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")
        verbose_name = "foto de habitación"
        verbose_name_plural = "fotos de habitación"


class SeasonRate(TimeStampedModel):
    class Season(models.TextChoices):
        BAJA = "baja", "Temporada baja"
        NORMAL = "normal", "Temporada normal"
        ALTA = "alta", "Temporada alta"
        FERIADO = "feriado", "Feriado"

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="tarifas")
    season = models.CharField(max_length=20, choices=Season.choices)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        verbose_name = "tarifa por temporada"
        verbose_name_plural = "tarifas por temporada"
        ordering = ("start_date",)


class RoomAvailability(TimeStampedModel):
    class Reason(models.TextChoices):
        RESERVA = "reserva", "Reserva"
        BLOQUEO = "bloqueo", "Bloqueo manual"
        MANTENIMIENTO = "mantenimiento", "Mantenimiento"

    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name="disponibilidad"
    )
    date = models.DateField()
    is_available = models.BooleanField(default=True)
    reason = models.CharField(max_length=20, choices=Reason.choices, blank=True)

    class Meta:
        verbose_name = "disponibilidad"
        verbose_name_plural = "disponibilidades"
        unique_together = ("room", "date")
        ordering = ("date",)
