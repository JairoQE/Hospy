from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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


class UserSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

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
            "phone",
            "photo",
            "photo_url",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "role",
            "owner_status",
            "owner_rejection_reason",
            "date_joined",
            "last_login",
            "photo_url",
        )

    def get_photo_url(self, obj):
        return media_public_path(obj.photo) if obj.photo else None


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
