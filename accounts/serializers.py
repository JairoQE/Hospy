from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from accounts.follows import followers_count, following_count, is_following
from properties.images import normalize_uploaded_image
from properties.media_urls import media_public_path
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .captcha import verify_captcha_token
from .payout import normalize_dni, validate_dni

User = get_user_model()


def _unique_username_from_email(email: str) -> str:
    """Genera username único a partir del correo (login real es el email)."""
    base = email.split("@")[0].replace(".", "_")[:30] or "usuario"
    candidate = base
    n = 1
    while User.objects.filter(username=candidate).exists():
        suffix = str(n)
        candidate = f"{base[: 30 - len(suffix)]}{suffix}"
        n += 1
    return candidate


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login con email en lugar de username."""

    username_field = User.EMAIL_FIELD
    captcha_token = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        verify_captcha_token(
            attrs.pop("captcha_token", ""),
            request=self.context.get("request"),
        )
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token


ROLE_CATEGORY = {
    User.Role.HUESPED: "Huésped en Hospy",
    User.Role.PROPIETARIO: "Propietario de hospedajes",
    User.Role.PATROCINADOR: "Patrocinador en Hospy",
    User.Role.ADMINISTRADOR: "Equipo Hospy",
}


class UserSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    cover_photo_url = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    owner_average_rating = serializers.SerializerMethodField()
    owner_reviews_count = serializers.SerializerMethodField()
    accommodations_count = serializers.SerializerMethodField()
    accommodations = serializers.SerializerMethodField()
    has_password = serializers.SerializerMethodField()
    payout_profile_complete = serializers.SerializerMethodField()
    payout_missing_fields = serializers.SerializerMethodField()
    online_payout_ready = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "roles",
            "is_developer",
            "is_identity_verified",
            "identity_verified_at",
            "identity_document_number",
            "identity_full_name",
            "owner_status",
            "owner_rejection_reason",
            "sponsor_status",
            "sponsor_rejection_reason",
            "sponsor_warning_message",
            "sponsor_warning_at",
            "owner_warning_message",
            "owner_warning_at",
            "owner_strikes",
            "phone",
            "bio",
            "payout_document_number",
            "payout_mp_email",
            "payout_bank_cci",
            "payout_profile_complete",
            "payout_missing_fields",
            "online_payout_ready",
            "photo",
            "photo_url",
            "cover_photo",
            "cover_photo_url",
            "followers_count",
            "following_count",
            "owner_average_rating",
            "owner_reviews_count",
            "accommodations_count",
            "accommodations",
            "has_password",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "roles",
            "is_developer",
            "is_identity_verified",
            "identity_verified_at",
            "identity_document_number",
            "identity_full_name",
            "owner_status",
            "owner_rejection_reason",
            "sponsor_status",
            "sponsor_rejection_reason",
            "sponsor_warning_message",
            "sponsor_warning_at",
            "owner_warning_message",
            "owner_warning_at",
            "owner_strikes",
            "date_joined",
            "last_login",
            "photo_url",
            "cover_photo_url",
            "followers_count",
            "following_count",
            "has_password",
            "payout_profile_complete",
            "payout_missing_fields",
            "online_payout_ready",
        )

    def get_roles(self, obj):
        return obj.capability_roles()

    def get_payout_profile_complete(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        return obj.payout_profile_complete

    def get_payout_missing_fields(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        from .payout import owner_payout_missing_fields

        return owner_payout_missing_fields(obj)

    def get_online_payout_ready(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        from .payout import owner_has_online_payout_profile

        return owner_has_online_payout_profile(obj)

    def get_photo_url(self, obj):
        return media_public_path(obj.photo) if obj.photo else None

    def get_cover_photo_url(self, obj):
        return media_public_path(obj.cover_photo) if obj.cover_photo else None

    def get_followers_count(self, obj):
        return followers_count(obj)

    def get_following_count(self, obj):
        return following_count(obj)

    def _owner_stats_cached(self, obj):
        if not hasattr(obj, "_owner_stats_cache"):
            from properties.owner_stats import get_owner_public_stats

            obj._owner_stats_cache = get_owner_public_stats(obj.pk)
        return obj._owner_stats_cache

    def get_owner_average_rating(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        return self._owner_stats_cached(obj)["average_rating"]

    def get_owner_reviews_count(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        return self._owner_stats_cached(obj)["reviews_count"]

    def get_accommodations_count(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        return self._owner_stats_cached(obj)["accommodations_count"]

    def get_accommodations(self, obj):
        if obj.role != User.Role.PROPIETARIO:
            return None
        from properties.owner_stats import owner_public_accommodations
        from properties.serializers import AccommodationListSerializer

        qs = owner_public_accommodations(obj.pk)
        return AccommodationListSerializer(qs, many=True, context=self.context).data

    def get_has_password(self, obj):
        return obj.has_usable_password()

    def validate_photo(self, value):
        if value:
            return normalize_uploaded_image(value)
        return value

    def validate_cover_photo(self, value):
        if value:
            return normalize_uploaded_image(value)
        return value

    def validate_bio(self, value):
        return (value or "").strip()[:500]

    def validate_payout_document_number(self, value):
        if not value:
            return ""
        try:
            return validate_dni(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_payout_mp_email(self, value):
        return (value or "").strip().lower()

    def validate_payout_bank_cci(self, value):
        cleaned = (value or "").strip().replace(" ", "")
        if cleaned and (not cleaned.isdigit() or len(cleaned) != 20):
            raise serializers.ValidationError(
                "El CCI debe tener 20 dígitos numéricos."
            )
        return cleaned

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance and self.instance.role == User.Role.PROPIETARIO:
            doc = attrs.get(
                "payout_document_number",
                self.instance.payout_document_number,
            )
            if doc:
                attrs["payout_document_number"] = normalize_dni(doc)
        return attrs


class AdminUserListSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    bookings_count = serializers.IntegerField(read_only=True)
    hospedajes_count = serializers.IntegerField(read_only=True)
    moderation_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "owner_status",
            "sponsor_status",
            "moderation_status",
            "is_active",
            "phone",
            "photo_url",
            "date_joined",
            "last_login",
            "bookings_count",
            "hospedajes_count",
        )

    def get_photo_url(self, obj):
        return media_public_path(obj.photo) if obj.photo else None

    def get_moderation_status(self, obj):
        if obj.role == User.Role.PROPIETARIO and obj.owner_status:
            return obj.owner_status
        if obj.role == User.Role.PATROCINADOR and obj.sponsor_status:
            return obj.sponsor_status
        return ""


class FollowListUserSerializer(serializers.ModelSerializer):
    """Usuario resumido en listas de seguidores / siguiendo."""

    photo_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_self = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "role",
            "photo_url",
            "is_following",
            "is_self",
        )

    def get_photo_url(self, obj):
        return media_public_path(obj.photo) if obj.photo else None

    def get_display_name(self, obj):
        full = obj.get_full_name().strip()
        return full or obj.username

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return is_following(request.user, obj)

    def get_is_self(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and request.user.pk == obj.pk)


class PublicUserProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    cover_photo_url = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    role_category = serializers.SerializerMethodField()
    is_self = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "role",
            "is_identity_verified",
            "bio",
            "photo_url",
            "cover_photo_url",
            "followers_count",
            "following_count",
            "is_following",
            "is_self",
            "role_category",
            "date_joined",
        )

    def get_photo_url(self, obj):
        return media_public_path(obj.photo) if obj.photo else None

    def get_cover_photo_url(self, obj):
        return media_public_path(obj.cover_photo) if obj.cover_photo else None

    def get_followers_count(self, obj):
        return followers_count(obj)

    def get_following_count(self, obj):
        return following_count(obj)

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return is_following(request.user, obj)

    def get_is_self(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and request.user.pk == obj.pk)

    def get_role_category(self, obj):
        return ROLE_CATEGORY.get(obj.role, "Usuario de Hospy")


class OwnerPublicProfileSerializer(PublicUserProfileSerializer):
    """Perfil público de propietario con locales y calificación global."""

    owner_average_rating = serializers.SerializerMethodField()
    owner_reviews_count = serializers.SerializerMethodField()
    accommodations_count = serializers.SerializerMethodField()
    accommodations = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()
    identity_verified = serializers.SerializerMethodField()
    is_superhost = serializers.SerializerMethodField()
    responds_fast = serializers.SerializerMethodField()
    response_time_label = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    phone_verified = serializers.SerializerMethodField()
    languages = serializers.SerializerMethodField()

    class Meta(PublicUserProfileSerializer.Meta):
        fields = PublicUserProfileSerializer.Meta.fields + (
            "owner_average_rating",
            "owner_reviews_count",
            "accommodations_count",
            "accommodations",
            "recent_reviews",
            "identity_verified",
            "is_superhost",
            "responds_fast",
            "response_time_label",
            "email_verified",
            "phone_verified",
            "languages",
        )

    def _owner_stats_cached(self, obj):
        if not hasattr(obj, "_owner_stats_cache"):
            from properties.owner_stats import get_owner_public_stats

            obj._owner_stats_cache = get_owner_public_stats(obj.pk)
        return obj._owner_stats_cache

    def get_owner_average_rating(self, obj):
        return self._owner_stats_cached(obj)["average_rating"]

    def get_owner_reviews_count(self, obj):
        return self._owner_stats_cached(obj)["reviews_count"]

    def get_accommodations_count(self, obj):
        return self._owner_stats_cached(obj)["accommodations_count"]

    def get_accommodations(self, obj):
        from properties.owner_stats import owner_public_accommodations
        from properties.serializers import OwnerStoreAccommodationSerializer

        qs = owner_public_accommodations(obj.pk)
        return OwnerStoreAccommodationSerializer(qs, many=True, context=self.context).data

    def get_recent_reviews(self, obj):
        from properties.media_urls import media_public_path
        from properties.owner_stats import owner_recent_reviews

        rows = []
        from reviews.services import booking_for_review

        for r in owner_recent_reviews(obj.pk, limit=6):
            author = r.author
            stay = booking_for_review(r)
            rows.append(
                {
                    "id": r.id,
                    "author_name": author.get_full_name() or author.username,
                    "author_photo_url": media_public_path(author.photo)
                    if author.photo
                    else None,
                    "rating": r.rating,
                    "comment": r.comment,
                    "created_at": r.created_at,
                    "accommodation_name": r.accommodation.name,
                    "habitacion": stay.room.number if stay else None,
                    "check_in": stay.check_in.isoformat() if stay else None,
                    "check_out": stay.check_out.isoformat() if stay else None,
                    "total_amount": str(stay.total_amount) if stay else None,
                }
            )
        return rows

    def get_identity_verified(self, obj):
        return bool(getattr(obj, "is_identity_verified", False))

    def get_is_superhost(self, obj):
        stats = self._owner_stats_cached(obj)
        return stats["average_rating"] >= 4.8 and stats["reviews_count"] >= 5

    def get_responds_fast(self, obj):
        return bool(obj.phone) or obj.owner_status == User.OwnerStatus.APROBADO

    def get_response_time_label(self, obj):
        return "< 1 hora" if self.get_responds_fast(obj) else "En el día"

    def get_email_verified(self, obj):
        return bool(obj.email)

    def get_phone_verified(self, obj):
        return bool((obj.phone or "").strip())

    def get_languages(self, obj):
        return ["Español"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    captcha_token = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
        help_text="Opcional; si no se envía, se genera desde el correo.",
    )

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "password", "captcha_token")

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return email

    def validate_username(self, value):
        username = (value or "").strip()
        if not username:
            return ""
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return username

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        verify_captcha_token(
            attrs.pop("captcha_token", ""),
            request=self.context.get("request"),
        )
        if not attrs.get("username"):
            attrs["username"] = _unique_username_from_email(attrs["email"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data, role=User.Role.HUESPED)
        user.set_password(password)
        user.save()
        return user


class SocialAuthRoleMixin(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=(
            ("login", "Solo iniciar sesión"),
            ("huesped", "Huésped"),
            ("propietario", "Propietario"),
            ("patrocinador", "Patrocinador"),
        ),
        default="huesped",
        required=False,
    )


class GoogleAuthSerializer(SocialAuthRoleMixin):
    credential = serializers.CharField(
        help_text="ID token JWT devuelto por Google Identity Services.",
    )


class FacebookAuthSerializer(SocialAuthRoleMixin):
    access_token = serializers.CharField(
        help_text="Access token devuelto por Facebook Login.",
    )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)


class ChangeEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    def validate_email(self, value):
        email = value.lower().strip()
        user = self.context["request"].user
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return email

    def validate(self, attrs):
        user = self.context["request"].user
        if user.has_usable_password():
            pwd = (attrs.get("current_password") or "").strip()
            if not pwd:
                raise serializers.ValidationError(
                    {"current_password": "Confirma tu contraseña actual."}
                )
            if not user.check_password(pwd):
                raise serializers.ValidationError(
                    {"current_password": "Contraseña incorrecta."}
                )
        return attrs

    def save(self):
        user = self.context["request"].user
        user.email = self.validated_data["email"]
        user.save(update_fields=["email"])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password2": "Las contraseñas no coinciden."}
            )
        if user.has_usable_password():
            pwd = (attrs.get("current_password") or "").strip()
            if not pwd:
                raise serializers.ValidationError(
                    {"current_password": "Confirma tu contraseña actual."}
                )
            if not user.check_password(pwd):
                raise serializers.ValidationError(
                    {"current_password": "Contraseña incorrecta."}
                )
            if user.check_password(attrs["new_password"]):
                raise serializers.ValidationError(
                    {"new_password": "La nueva contraseña debe ser distinta a la actual."}
                )
        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class RegisterPropietarioSerializer(RegisterSerializer):
    """Registro con rol Propietario para gestionar hospedajes."""

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(
            **validated_data,
            role=User.Role.PROPIETARIO,
            owner_status=User.OwnerStatus.PENDIENTE,
        )
        user.set_password(password)
        user.save()
        return user


class OwnerApprovalSerializer(serializers.Serializer):
    aprobado = serializers.BooleanField(default=True)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if not data.get("aprobado", True) and not data.get("motivo", "").strip():
            raise serializers.ValidationError(
                {"motivo": "Indica el motivo del rechazo."}
            )
        return data


class AdminAssignAdministratorSerializer(serializers.Serializer):
    admin = serializers.BooleanField()

    def validate(self, attrs):
        target = self.context["target"]
        actor = self.context["request"].user
        make_admin = attrs["admin"]

        if make_admin and target.role == User.Role.ADMINISTRADOR:
            raise serializers.ValidationError(
                {"admin": "Este usuario ya es administrador."}
            )
        if not make_admin and target.role != User.Role.ADMINISTRADOR:
            raise serializers.ValidationError(
                {"admin": "Este usuario no es administrador."}
            )
        if not make_admin:
            active_admins = User.objects.filter(
                role=User.Role.ADMINISTRADOR,
                is_active=True,
            ).count()
            if active_admins <= 1:
                raise serializers.ValidationError(
                    {"admin": "Debe haber al menos un administrador activo en la plataforma."}
                )
            if target.pk == actor.pk:
                raise serializers.ValidationError(
                    {"admin": "No puedes quitarte el rol de administrador a ti mismo."}
                )
        return attrs
