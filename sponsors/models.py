from django.conf import settings
from django.db import models
class SponsorAd(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Imagen"
        GIF = "gif", "GIF"
        VIDEO = "video", "Video"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"
        BAJA = "baja", "Dado de baja"

    sponsor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sponsor_ads",
    )
    title = models.CharField(max_length=120)
    link_url = models.URLField(blank=True)
    media = models.FileField(upload_to="anuncios/")
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    duration_seconds = models.PositiveSmallIntegerField(
        default=5,
        help_text="Segundos visibles en la rotación (máx. 10).",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    rejection_reason = models.TextField(blank=True)
    takedown_reason = models.TextField(
        blank=True,
        help_text="Motivo de baja por reporte de usuarios o administrador.",
    )
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]
        verbose_name = "anuncio patrocinado"
        verbose_name_plural = "anuncios patrocinados"

    def __str__(self):
        return f"{self.title} ({self.sponsor_id})"


class SponsorAdReport(models.Model):
    class Reason(models.TextChoices):
        INAPPROPIADO = "inapropiado", "Contenido inapropiado"
        ENGAÑOSO = "enganoso", "Engañoso o falso"
        SPAM = "spam", "Spam"
        OTRO = "otro", "Otro"

    class Status(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        RESUELTO = "resuelto", "Resuelto"
        DESCARTADO = "descartado", "Descartado"

    ad = models.ForeignKey(
        SponsorAd,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sponsor_ad_reports_filed",
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    detail = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDIENTE,
    )
    admin_notes = models.TextField(blank=True)
    warning_sent = models.TextField(
        blank=True,
        help_text="Advertencia enviada al patrocinador al dar de baja el anuncio.",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sponsor_ad_reports_reviewed",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "reporte de anuncio"
        verbose_name_plural = "reportes de anuncios"
        constraints = [
            models.UniqueConstraint(
                fields=["ad", "reporter"],
                name="sponsors_unique_report_per_user",
            ),
        ]

    def __str__(self):
        return f"Reporte #{self.pk} — anuncio {self.ad_id}"
