from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from accounts.follows import followers_count, following_count, is_following
from properties.images import validate_uploaded_image
from properties.media_urls import media_public_path
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "owner_status",
            "owner_rejection_reason",
            "sponsor_status",
            "sponsor_rejection_reason",
            "sponsor_warning_message",
            "sponsor_warning_at",
            "phone",
            "bio",
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
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "role",
            "owner_status",
            "owner_rejection_reason",
            "sponsor_status",
            "sponsor_rejection_reason",
            "sponsor_warning_message",
            "sponsor_warning_at",
            "date_joined",
            "last_login",
            "photo_url",
            "cover_photo_url",
            "followers_count",
            "following_count",
        )

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

    def validate_photo(self, value):
        if value:
            validate_uploaded_image(value)
        return value

    def validate_cover_photo(self, value):
        if value:
            validate_uploaded_image(value)
        return value

    def validate_bio(self, value):
        return (value or "").strip()[:500]


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
        for r in owner_recent_reviews(obj.pk, limit=6):
            author = r.author
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
                }
            )
        return rows

    def get_identity_verified(self, obj):
        return obj.owner_status == User.OwnerStatus.APROBADO

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
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
        help_text="Opcional; si no se envía, se genera desde el correo.",
    )

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "password")

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
        if not attrs.get("username"):
            attrs["username"] = _unique_username_from_email(attrs["email"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data, role=User.Role.HUESPED)
        user.set_password(password)
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)


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
