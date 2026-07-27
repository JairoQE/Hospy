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
    google_id = models.CharField(
        "ID de Google",
        max_length=255,
        blank=True,
        null=True,
        unique=True,
    )
    facebook_id = models.CharField(
        "ID de Facebook",
        max_length=255,
        blank=True,
        null=True,
        unique=True,
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.HUESPED,
    )
    is_developer = models.BooleanField(
        "acceso desarrollador API",
        default=False,
        help_text="Capacidad aditiva: puede usar la API de integración sin cambiar su rol principal.",
    )
    is_identity_verified = models.BooleanField(
        "identidad verificada (RENIEC)",
        default=False,
        help_text="Verificación opcional vía DNI/Factiliza. Da beneficios, no bloquea funciones.",
    )
    identity_verified_at = models.DateTimeField(
        "fecha de verificación de identidad",
        null=True,
        blank=True,
    )
    identity_document_number = models.CharField(
        "DNI verificado",
        max_length=12,
        blank=True,
        help_text="Documento usado en la verificación de identidad.",
    )
    identity_full_name = models.CharField(
        "nombre según RENIEC",
        max_length=200,
        blank=True,
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
    owner_warning_message = models.TextField(
        "última advertencia (propietario)",
        blank=True,
    )
    owner_warning_at = models.DateTimeField(null=True, blank=True)
    owner_strikes = models.PositiveSmallIntegerField(
        "amonestaciones por reembolsos",
        default=0,
    )
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
    payout_document_number = models.CharField(
        "DNI para cobros",
        max_length=12,
        blank=True,
        help_text="Documento de identidad del titular de la cuenta de cobro.",
    )
    payout_mp_email = models.EmailField(
        "correo Mercado Pago",
        blank=True,
        help_text="Correo de la cuenta Mercado Pago donde recibirás los pagos.",
    )
    payout_bank_cci = models.CharField(
        "CCI (opcional)",
        max_length=20,
        blank=True,
        help_text="Código de cuenta interbancario, alternativa a Mercado Pago.",
    )
    is_deleted = models.BooleanField(
        "eliminado (soft delete)",
        default=False,
        db_index=True,
        help_text="Si es True, la cuenta no puede iniciar sesión ni aparecer en listados públicos.",
    )
    deleted_at = models.DateTimeField(
        "fecha de eliminación",
        null=True,
        blank=True,
    )
    deleted_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users_soft_deleted",
        verbose_name="eliminado por",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self):
        return self.email

    def soft_delete(self, *, by=None):
        """Baja lógica: desactiva login y marca eliminado. Solo para admin vía API."""
        from django.utils import timezone

        self.is_deleted = True
        self.is_active = False
        self.deleted_at = timezone.now()
        if by is not None:
            self.deleted_by = by
        self.save(
            update_fields=["is_deleted", "is_active", "deleted_at", "deleted_by"]
        )

    def restore(self):
        """Revierte soft delete y reactiva la cuenta."""
        self.is_deleted = False
        self.is_active = True
        self.deleted_at = None
        self.deleted_by = None
        self.save(
            update_fields=["is_deleted", "is_active", "deleted_at", "deleted_by"]
        )

    @property
    def is_propietario(self):
        return self.role == self.Role.PROPIETARIO

    @property
    def is_huesped(self):
        return self.role == self.Role.HUESPED

    @property
    def can_book_as_guest(self) -> bool:
        """Cualquier cuenta autenticada puede alquilar (multirol)."""
        return True

    def capability_roles(self) -> list[str]:
        """
        Roles/capacidades efectivos para UI y auditoría.
        El rol principal del panel se combina con alquiler y desarrollador.
        """
        roles: list[str] = []
        if self.role == self.Role.PROPIETARIO:
            roles.append(self.Role.PROPIETARIO)
            roles.append(self.Role.HUESPED)
        elif self.role == self.Role.ADMINISTRADOR:
            roles.append(self.Role.ADMINISTRADOR)
            roles.append(self.Role.HUESPED)
        elif self.role == self.Role.PATROCINADOR:
            roles.append(self.Role.PATROCINADOR)
            roles.append(self.Role.HUESPED)
        else:
            roles.append(self.Role.HUESPED)
        if self.is_developer:
            roles.append("desarrollador")
        if self.is_identity_verified:
            roles.append("verificado")
        return roles

    @property
    def is_owner_approved(self) -> bool:
        if self.role != self.Role.PROPIETARIO:
            return False
        return self.owner_status == self.OwnerStatus.APROBADO

    @property
    def payout_profile_complete(self) -> bool:
        from .payout import owner_has_complete_payout_profile

        return owner_has_complete_payout_profile(self)

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
