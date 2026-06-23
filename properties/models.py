from datetime import time, timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Service(TimeStampedModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=120)
    icon = models.CharField(
        max_length=50, blank=True, help_text="Nombre del ícono (ej. wifi)"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "servicio"
        verbose_name_plural = "servicios"
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Accommodation(TimeStampedModel):
    class Type(models.TextChoices):
        HOTEL = "hotel", "Hotel"
        HOSTAL = "hostal", "Hostal"
        HOSPEDAJE = "hospedaje", "Hospedaje"
        CASA_DEPARTAMENTO = "casa_departamento", "Casa o departamento"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de aprobación"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"
        INACTIVO = "inactivo", "Inactivo"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hospedajes",
    )
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)  # soft delete (RF-15)

    # Ubicación (RF-16, RF-17)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="Perú")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    average_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0, editable=False
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Motivo si el administrador rechaza el registro (HU-10).",
    )
    services = models.ManyToManyField(Service, related_name="hospedajes", blank=True)

    check_in_from = models.TimeField(
        "check-in desde",
        default=time(13, 0),
        help_text="Hora estándar de entrada (política Hospy por defecto 13:00).",
    )
    check_out_until = models.TimeField(
        "check-out hasta",
        default=time(11, 0),
        help_text="Hora estándar de salida (política Hospy por defecto 11:00).",
    )
    check_in_instructions = models.TextField(
        "instrucciones de check-in",
        blank=True,
        max_length=2000,
        help_text="Texto visible en la ficha: cómo llegar, recepción, llaves, etc.",
    )
    check_out_instructions = models.TextField(
        "instrucciones de check-out",
        blank=True,
        max_length=2000,
        help_text="Texto visible en la ficha: horario de salida, entrega de llaves, etc.",
    )
    cancellation_policy_notes = models.TextField(
        "política de cancelación del local",
        blank=True,
        max_length=2000,
        help_text="Condiciones propias del anfitrión (complementa las reglas de Hospy).",
    )

    class RefundPolicyType(models.TextChoices):
        FLEXIBLE = "flexible", "Flexible"
        MODERATE = "moderate", "Moderada"
        STRICT = "strict", "Estricta"
        NON_REFUNDABLE = "non_refundable", "No reembolsable"
        CUSTOM = "custom", "Personalizada"

    refund_policy_type = models.CharField(
        "tipo de reembolso",
        max_length=20,
        choices=RefundPolicyType.choices,
        default=RefundPolicyType.FLEXIBLE,
    )
    refund_hours_before_full = models.PositiveSmallIntegerField(
        "horas para reembolso completo",
        null=True,
        blank=True,
        help_text="Solo política flexible. Vacío = 48 h (estándar Hospy).",
    )
    refund_policy_notes = models.TextField(
        "detalle de reembolso",
        blank=True,
        max_length=2000,
        help_text="Texto libre; obligatorio recomendado si el tipo es Personalizada.",
    )
    cancel_hours_before_checkin = models.PositiveSmallIntegerField(
        "horas mínimas antes del check-in para cancelar",
        null=True,
        blank=True,
        help_text="Plazo del huésped para cancelar en la app. Vacío = 48 h (estándar Hospy).",
    )
    refund_processing_days = models.PositiveSmallIntegerField(
        "días para procesar reembolso tras cancelación",
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(7)],
        help_text="Plazo máximo (1–7 días) para que el anfitrión registre el reembolso directo.",
    )

    class Meta:
        verbose_name = "hospedaje"
        verbose_name_plural = "hospedajes"
        ordering = ("-created_at",)

    def __str__(self):
        return self.name


class AccommodationOffer(TimeStampedModel):
    """Descuento temporal sobre el precio base de las habitaciones del hospedaje."""

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="ofertas",
    )
    title = models.CharField(max_length=120, blank=True)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(80),
        ],
        help_text="Porcentaje de descuento (1–80).",
    )
    start_date = models.DateField()
    duration_days = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        help_text="Duración en días naturales (incluye el día de inicio).",
    )
    end_date = models.DateField(editable=False)
    is_active = models.BooleanField(
        default=True,
        help_text="Si está desactivada, no aplica aunque esté en el rango de fechas.",
    )
    rooms = models.ManyToManyField(
        "rooms.Room",
        related_name="ofertas",
        blank=True,
        help_text="Habitaciones incluidas en la promoción.",
    )

    class Meta:
        verbose_name = "oferta"
        verbose_name_plural = "ofertas"
        ordering = ("-start_date", "-created_at")

    def __str__(self):
        label = self.title or f"{self.discount_percent}%"
        return f"{label} ({self.start_date} → {self.end_date})"

    def save(self, *args, **kwargs):
        self.end_date = self.start_date + timedelta(days=self.duration_days - 1)
        super().save(*args, **kwargs)

    def is_current(self, on_date=None) -> bool:
        if not self.is_active:
            return False
        on_date = on_date or timezone.localdate()
        return self.start_date <= on_date <= self.end_date


class BrowseTile(TimeStampedModel):
    """Bloques del home: tipos, regiones y departamentos (administrables)."""

    class Group(models.TextChoices):
        ACCOMMODATION_TYPE = "tipo", "Tipo de alojamiento"
        NATURAL_REGION = "region", "Región natural"
        DEPARTMENT = "departamento", "Departamento"

    group = models.CharField(max_length=20, choices=Group.choices, db_index=True)
    title = models.CharField(max_length=100)
    subtitle = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(max_length=80)
    filter_value = models.CharField(
        max_length=80,
        help_text=(
            "Filtro API: tipo (hotel…), zona (costa…) o departamento (nombre, ej. Lima)."
        ),
    )
    image = models.ImageField(upload_to="inicio/", blank=True, null=True)
    gradient_css = models.CharField(
        max_length=255,
        blank=True,
        default="linear-gradient(135deg, #0d6e6e 0%, #4db6ac 100%)",
    )
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "bloque de inicio"
        verbose_name_plural = "bloques de inicio"
        ordering = ("group", "order", "title")
        constraints = [
            models.UniqueConstraint(
                fields=("group", "slug"),
                name="unique_browse_tile_group_slug",
            )
        ]

    def __str__(self):
        return f"{self.get_group_display()}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title) or "item"
        super().save(*args, **kwargs)


class BrowseTileClick(models.Model):
    """Registro de clics en tarjetas del home (tipos, regiones, departamentos)."""

    tile = models.ForeignKey(
        BrowseTile,
        on_delete=models.CASCADE,
        related_name="clicks",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "clic en bloque de inicio"
        verbose_name_plural = "clics en bloques de inicio"
        indexes = [
            models.Index(fields=["tile", "created_at"]),
        ]

    def __str__(self):
        return f"Clic #{self.pk} · {self.tile_id}"


class AccommodationFAQ(TimeStampedModel):
    """Preguntas frecuentes definidas por el propietario."""

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="faqs",
    )
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")
        verbose_name = "pregunta frecuente"
        verbose_name_plural = "preguntas frecuentes"

    def __str__(self):
        return self.question[:80]


class AccommodationPhoto(TimeStampedModel):
    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="fotos",
    )
    image = models.ImageField(upload_to="hospedajes/")
    is_primary = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")
        verbose_name = "foto de hospedaje"
        verbose_name_plural = "fotos de hospedaje"
