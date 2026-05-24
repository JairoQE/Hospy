from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        HUESPED = "huesped", "Huésped"
        PROPIETARIO = "propietario", "Propietario"
        ADMINISTRADOR = "administrador", "Administrador"

    class OwnerStatus(models.TextChoices):
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
    phone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to="usuarios/", blank=True, null=True)

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

    def save(self, *args, **kwargs):
        if self.role == self.Role.PROPIETARIO and not self.owner_status:
            self.owner_status = self.OwnerStatus.PENDIENTE
        elif self.role != self.Role.PROPIETARIO:
            self.owner_status = ""
            self.owner_rejection_reason = ""
        super().save(*args, **kwargs)
