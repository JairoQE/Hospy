from django.conf import settings
from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Organization(TimeStampedModel):
    """Página de empresa (fase 1: un titular, sin locales/gestores)."""

    name = models.CharField("nombre comercial", max_length=160)
    slug = models.SlugField(unique=True, max_length=160)
    description = models.TextField("descripción", blank=True, max_length=2000)
    location = models.CharField(
        "ubicación principal",
        max_length=200,
        blank=True,
        help_text="Ej. Miraflores, Lima",
    )
    logo = models.ImageField(upload_to="empresas/logos/", blank=True, null=True)
    cover = models.ImageField(upload_to="empresas/portadas/", blank=True, null=True)
    ruc = models.CharField(max_length=11, blank=True, db_index=True)
    legal_name = models.CharField(
        "razón social (SUNAT)",
        max_length=250,
        blank=True,
    )
    is_verified = models.BooleanField(
        "empresa verificada",
        default=False,
        help_text="Verificación vía RUC / SUNAT.",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(
        "publicada",
        default=False,
        help_text="Si es True, la página es visible públicamente (con o sin badge).",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizations_created",
    )

    class Meta:
        verbose_name = "organización"
        verbose_name_plural = "organizaciones"
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base = slugify(self.name) or "empresa"
            slug = base
            n = 2
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)


class OrganizationMembership(TimeStampedModel):
    class Role(models.TextChoices):
        TITULAR = "titular", "Titular"
        ORG_MANAGER = "org_manager", "Gestor de organización"
        LOCAL_MANAGER = "local_manager", "Gestor de local"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.TITULAR,
    )

    class Meta:
        verbose_name = "membresía de organización"
        verbose_name_plural = "membresías de organización"
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "user"),
                name="uniq_org_membership_user",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} @ {self.organization_id} ({self.role})"
