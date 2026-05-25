from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        HUESPED = "huesped", "Huésped"
        PROPIETARIO = "propietario", "Propietario"
        PATROCINADOR = "patrocinador", "Patrocinador"
        ADMINISTRADOR = "administrador", "Administrador"

    class OwnerStatus(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de aprobación"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    class SponsorStatus(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de aprobación"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    email = models.EmailField("correo electrónico", unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.HUESPED,
    )
    owner_status = models.CharField(
        max_length=20,
        choices=OwnerStatus.choices,
        blank=True,
        default="",
    )
    owner_rejection_reason = models.TextField(
        "motivo de rechazo (propietario)",
        blank=True,
    )
    sponsor_status = models.CharField(
        max_length=20,
        choices=SponsorStatus.choices,
        blank=True,
        default="",
    )
    sponsor_rejection_reason = models.TextField(
        "motivo de rechazo (patrocinador)",
        blank=True,
    )
    sponsor_warning_message = models.TextField(
        "última advertencia (patrocinador)",
        blank=True,
    )
    sponsor_warning_at = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to="usuarios/", blank=True, null=True)
    cover_photo = models.ImageField(
        upload_to="usuarios/portadas/",
        blank=True,
        null=True,
        verbose_name="foto de portada",
    )
    bio = models.TextField(
        "biografía",
        blank=True,
        max_length=500,
        help_text="Texto visible en el perfil público.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self):
        return self.email

    @property
    def is_propietario(self):
        return self.role == self.Role.PROPIETARIO

    @property
    def is_huesped(self):
        return self.role == self.Role.HUESPED

    @property
    def is_owner_approved(self) -> bool:
        if self.role != self.Role.PROPIETARIO:
            return False
        return self.owner_status == self.OwnerStatus.APROBADO

    @property
    def is_sponsor_approved(self) -> bool:
        if self.role != self.Role.PATROCINADOR:
            return False
        return self.sponsor_status == self.SponsorStatus.APROBADO

    def save(self, *args, **kwargs):
        if self.role == self.Role.PROPIETARIO and not self.owner_status:
            self.owner_status = self.OwnerStatus.PENDIENTE
        elif self.role != self.Role.PROPIETARIO:
            self.owner_status = ""
            self.owner_rejection_reason = ""

        if self.role == self.Role.PATROCINADOR and not self.sponsor_status:
            self.sponsor_status = self.SponsorStatus.PENDIENTE
        elif self.role != self.Role.PATROCINADOR:
            self.sponsor_status = ""
            self.sponsor_rejection_reason = ""

        super().save(*args, **kwargs)


class UserFollow(models.Model):
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_set",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followers_set",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "seguimiento"
        verbose_name_plural = "seguimientos"
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="accounts_unique_follow",
            ),
        ]

    def __str__(self):
        return f"{self.follower_id} → {self.following_id}"
