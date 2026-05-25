from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.permissions import IsAdministrador
from notifications.services import (
    notify_owner_registration_moderated,
    notify_owner_registration_submitted,
)

from .auth_throttle import AuthEndpointThrottle
from .password_reset import reset_password, send_password_reset_email
from sponsors.serializers import RegisterPatrocinadorSerializer, SponsorApprovalSerializer

from accounts.follows import toggle_follow

from .serializers import (
    CustomTokenObtainPairSerializer,
    OwnerApprovalSerializer,
    OwnerPublicProfileSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PublicUserProfileSerializer,
    RegisterPropietarioSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/registro/ — devuelve JWT tras registro (HU-01)."""

    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterPropietarioView(RegisterView):
    """POST /api/v1/auth/registro-propietario/ — cuenta para publicar hospedajes."""

    serializer_class = RegisterPropietarioSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(pk=response.data["user"]["id"])
        notify_owner_registration_submitted(user)
        return response


class RegisterPatrocinadorView(RegisterView):
    """POST /api/v1/auth/registro-patrocinador/ — cuenta para publicar anuncios."""

    serializer_class = RegisterPatrocinadorSerializer


class PerfilView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/perfil/"""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PublicUserProfileView(generics.RetrieveAPIView):
    """GET /api/v1/usuarios/<pk>/ — perfil público con seguidores."""

    permission_classes = (permissions.AllowAny,)
    serializer_class = PublicUserProfileSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=True)


class OwnerStoreView(generics.RetrieveAPIView):
    """GET /api/v1/anfitriones/<pk>/ — tienda pública del propietario (solo role propietario)."""

    permission_classes = (permissions.AllowAny,)
    serializer_class = OwnerPublicProfileSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=True, role=User.Role.PROPIETARIO)


class FollowUserView(APIView):
    """POST /api/v1/usuarios/<pk>/seguir/ — seguir o dejar de seguir."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_active=True)
        try:
            following_now, count = toggle_follow(request.user, target)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "following": following_now,
                "followers_count": count,
                "detail": "Ahora sigues a este usuario."
                if following_now
                else "Dejaste de seguir a este usuario.",
            }
        )


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/reset-password/ — envía enlace por email (RF-07)."""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user:
            send_password_reset_email(user)
        return Response(
            {
                "detail": "Si el correo está registrado, recibirás instrucciones para restablecer la contraseña."
            }
        )


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/reset-password/confirm/"""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_password(
                serializer.validated_data["uid"],
                serializer.validated_data["token"],
                serializer.validated_data["password"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Contraseña actualizada correctamente."})


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = (AuthEndpointThrottle,)


class PropietariosPendientesView(generics.ListAPIView):
    """GET /api/v1/auth/propietarios-pendientes/ — cola de moderación de cuentas."""

    serializer_class = UserSerializer
    permission_classes = (IsAdministrador,)

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.PROPIETARIO,
            owner_status=User.OwnerStatus.PENDIENTE,
        ).order_by("-date_joined")


class PropietarioAprobarView(APIView):
    """POST /api/v1/auth/propietarios/{id}/aprobar/ — validar cuenta de propietario."""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        owner = get_object_or_404(
            User,
            pk=pk,
            role=User.Role.PROPIETARIO,
        )
        if owner.owner_status != User.OwnerStatus.PENDIENTE:
            return Response(
                {"detail": "Solo se pueden moderar cuentas en estado pendiente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OwnerApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aprobado = serializer.validated_data["aprobado"]
        motivo = serializer.validated_data.get("motivo", "")

        if aprobado:
            owner.owner_status = User.OwnerStatus.APROBADO
            owner.owner_rejection_reason = ""
        else:
            owner.owner_status = User.OwnerStatus.RECHAZADO
            owner.owner_rejection_reason = motivo

        owner.save(
            update_fields=["owner_status", "owner_rejection_reason"],
        )
        notify_owner_registration_moderated(owner, aprobado, motivo)

        return Response(UserSerializer(owner).data)


class PatrocinadoresPendientesView(generics.ListAPIView):
    """GET /api/v1/auth/patrocinadores-pendientes/"""

    serializer_class = UserSerializer
    permission_classes = (IsAdministrador,)

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.PATROCINADOR,
            sponsor_status=User.SponsorStatus.PENDIENTE,
        ).order_by("-date_joined")


class PatrocinadorAprobarView(APIView):
    """POST /api/v1/auth/patrocinadores/{id}/aprobar/"""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        sponsor = get_object_or_404(User, pk=pk, role=User.Role.PATROCINADOR)
        if sponsor.sponsor_status != User.SponsorStatus.PENDIENTE:
            return Response(
                {"detail": "Solo se pueden moderar cuentas en estado pendiente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SponsorApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aprobado = serializer.validated_data["aprobado"]
        motivo = serializer.validated_data.get("motivo", "")

        if aprobado:
            sponsor.sponsor_status = User.SponsorStatus.APROBADO
            sponsor.sponsor_rejection_reason = ""
        else:
            sponsor.sponsor_status = User.SponsorStatus.RECHAZADO
            sponsor.sponsor_rejection_reason = motivo

        sponsor.save(update_fields=["sponsor_status", "sponsor_rejection_reason"])
        return Response(UserSerializer(sponsor).data)
