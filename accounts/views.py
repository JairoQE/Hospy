from django.contrib.auth import get_user_model
from django.db.models import Count, OuterRef, Q, Subquery
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
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

from audit.services import log_action

from .captcha import captcha_public_config

from .facebook_auth import resolve_facebook_user, verify_facebook_access_token
from .google_auth import resolve_google_user, verify_google_credential
from .models import UserFollow

from .serializers import (
    ChangeEmailSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    FacebookAuthSerializer,
    FollowListUserSerializer,
    GoogleAuthSerializer,
    OwnerApprovalSerializer,
    OwnerPublicProfileSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PublicUserProfileSerializer,
    RegisterPropietarioSerializer,
    AdminAssignAdministratorSerializer,
    AdminUserListSerializer,
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
        log_action(
            actor=user,
            action="auth.register",
            target_type="User",
            target_id=user.pk,
            target_label=user.email,
            request=request,
        )
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
        from integrations.security import assess_owner_location

        assess_owner_location(request=request, user=user)
        log_action(
            actor=user,
            action="auth.register_owner",
            target_type="User",
            target_id=user.pk,
            target_label=user.email,
            request=request,
        )
        return response


class RegisterPatrocinadorView(RegisterView):
    """POST /api/v1/auth/registro-patrocinador/ — cuenta para publicar anuncios."""

    serializer_class = RegisterPatrocinadorSerializer


class PerfilView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/perfil/"""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        fields = list(serializer.validated_data.keys())
        log_action(
            actor=self.request.user,
            action="profile.update",
            target_type="User",
            target_id=user.pk,
            target_label=user.email,
            metadata={"fields": fields},
            request=self.request,
        )


class ChangeEmailView(APIView):
    """POST /api/v1/auth/perfil/cambiar-email/"""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangeEmailSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        old_email = request.user.email
        user = serializer.save()
        log_action(
            actor=request.user,
            action="profile.change_email",
            target_type="User",
            target_id=user.pk,
            target_label=user.email,
            metadata={"from": old_email, "to": user.email},
            request=request,
        )
        return Response(
            {
                "detail": "Correo actualizado correctamente.",
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )


class ChangePasswordView(APIView):
    """POST /api/v1/auth/perfil/cambiar-contrasena/"""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(
            actor=request.user,
            action="profile.change_password",
            target_type="User",
            target_id=request.user.pk,
            target_label=request.user.email,
            request=request,
        )
        return Response({"detail": "Contraseña actualizada correctamente."})


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


class FollowListPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class UserFollowersListView(generics.ListAPIView):
    """GET /api/v1/auth/usuarios/<pk>/seguidores/ — quién sigue a este usuario."""

    permission_classes = (permissions.AllowAny,)
    serializer_class = FollowListUserSerializer
    pagination_class = FollowListPagination

    def get_queryset(self):
        target = get_object_or_404(User, pk=self.kwargs["pk"], is_active=True)
        follower_ids = UserFollow.objects.filter(following=target).values("follower_id")
        followed_at = UserFollow.objects.filter(
            following=target,
            follower=OuterRef("pk"),
        ).order_by("-created_at").values("created_at")[:1]
        return (
            User.objects.filter(pk__in=follower_ids, is_active=True)
            .annotate(followed_at=Subquery(followed_at))
            .order_by("-followed_at")
        )


class UserFollowingListView(generics.ListAPIView):
    """GET /api/v1/auth/usuarios/<pk>/siguiendo/ — a quién sigue este usuario."""

    permission_classes = (permissions.AllowAny,)
    serializer_class = FollowListUserSerializer
    pagination_class = FollowListPagination

    def get_queryset(self):
        target = get_object_or_404(User, pk=self.kwargs["pk"], is_active=True)
        following_ids = UserFollow.objects.filter(follower=target).values("following_id")
        followed_at = UserFollow.objects.filter(
            follower=target,
            following=OuterRef("pk"),
        ).order_by("-created_at").values("created_at")[:1]
        return (
            User.objects.filter(pk__in=following_ids, is_active=True)
            .annotate(followed_at=Subquery(followed_at))
            .order_by("-followed_at")
        )


class UserPublicBookingsListView(generics.ListAPIView):
    """GET /api/v1/auth/usuarios/<pk>/reservas-publicas/ — estadías completadas del huésped."""

    permission_classes = (permissions.AllowAny,)
    pagination_class = FollowListPagination

    def get_serializer_class(self):
        from bookings.serializers import PublicProfileBookingSerializer

        return PublicProfileBookingSerializer

    def get_queryset(self):
        from bookings.models import Booking

        target = get_object_or_404(User, pk=self.kwargs["pk"], is_active=True)
        return (
            Booking.objects.filter(
                guest=target,
                status=Booking.Status.COMPLETADA,
            )
            .select_related("room", "room__accommodation")
            .order_by("-check_out", "-created_at")
        )


class UserPublicReviewsListView(generics.ListAPIView):
    """GET /api/v1/auth/usuarios/<pk>/resenas-publicas/ — reseñas aprobadas del huésped."""

    permission_classes = (permissions.AllowAny,)
    pagination_class = FollowListPagination

    def get_serializer_class(self):
        from reviews.serializers import PublicProfileReviewSerializer

        return PublicProfileReviewSerializer

    def get_queryset(self):
        from reviews.models import Review

        target = get_object_or_404(User, pk=self.kwargs["pk"], is_active=True)
        return (
            Review.objects.filter(
                author=target,
                status=Review.Status.APROBADA,
            )
            .select_related("accommodation", "booking", "booking__room")
            .order_by("-created_at")
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

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            email = (request.data.get("email") or request.data.get("username") or "").strip()
            user = User.objects.filter(email__iexact=email).first()
            log_action(
                actor=user,
                action="auth.login",
                target_type="User",
                target_id=user.pk if user else None,
                target_label=email or "login",
                request=request,
            )
        return response


class CaptchaConfigView(APIView):
    """GET /api/v1/auth/captcha/ — clave pública y estado (sin secretos)."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return Response(captcha_public_config())


def _social_auth_response(user, created: bool) -> Response:
    if created and user.role == User.Role.PROPIETARIO:
        notify_owner_registration_submitted(user)
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(
        {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "created": created,
        },
        status=status_code,
    )


class GoogleAuthView(APIView):
    """POST /api/v1/auth/google/ — login o registro con token de Google."""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credential = serializer.validated_data["credential"]
        role_intent = serializer.validated_data.get("role") or "huesped"
        idinfo = verify_google_credential(credential)
        user, created = resolve_google_user(idinfo, role_intent)
        return _social_auth_response(user, created)


class FacebookAuthView(APIView):
    """POST /api/v1/auth/facebook/ — login o registro con Facebook Login."""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def post(self, request):
        serializer = FacebookAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]
        role_intent = serializer.validated_data.get("role") or "huesped"
        profile = verify_facebook_access_token(access_token)
        user, created = resolve_facebook_user(profile, role_intent)
        return _social_auth_response(user, created)


class AdminUsersPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AdminUsersListView(generics.ListAPIView):
    """GET /api/v1/auth/admin-usuarios/ — listado de todos los usuarios (admin)."""

    serializer_class = AdminUserListSerializer
    permission_classes = (IsAdministrador,)
    pagination_class = AdminUsersPagination

    def get_queryset(self):
        qs = User.objects.annotate(
            bookings_count=Count("reservas", distinct=True),
            hospedajes_count=Count("hospedajes", distinct=True),
        ).order_by("-date_joined")
        role = (self.request.query_params.get("role") or "").strip()
        if role:
            qs = qs.filter(role=role)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(username__icontains=q)
            )
        return qs


class AdminAssignAdministratorView(APIView):
    """POST /api/v1/auth/admin-usuarios/<pk>/administrador/ — asignar o quitar rol admin."""

    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_active=True)
        serializer = AdminAssignAdministratorSerializer(
            data=request.data,
            context={"request": request, "target": target},
        )
        serializer.is_valid(raise_exception=True)
        make_admin = serializer.validated_data["admin"]

        if make_admin:
            target.role = User.Role.ADMINISTRADOR
            target.is_staff = True
            target.save(update_fields=["role", "is_staff"])
            detail = f"{target.get_full_name() or target.email} ahora es administrador."
        else:
            target.role = User.Role.HUESPED
            target.is_staff = False
            target.save(update_fields=["role", "is_staff"])
            detail = f"Se quitó el rol de administrador a {target.get_full_name() or target.email}."

        log_action(
            actor=request.user,
            action="user.assign_admin" if make_admin else "user.revoke_admin",
            target_type="User",
            target_id=target.pk,
            target_label=target.email,
            request=request,
        )

        return Response(
            {
                "detail": detail,
                "user": AdminUserListSerializer(
                    User.objects.annotate(
                        bookings_count=Count("reservas", distinct=True),
                        hospedajes_count=Count("hospedajes", distinct=True),
                    ).get(pk=target.pk),
                ).data,
            }
        )


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
        log_action(
            actor=request.user,
            action="user.owner.approve" if aprobado else "user.owner.reject",
            target_type="User",
            target_id=owner.pk,
            target_label=owner.email,
            metadata={"motivo": motivo} if not aprobado else {},
            request=request,
        )

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
        log_action(
            actor=request.user,
            action="user.sponsor.approve" if aprobado else "user.sponsor.reject",
            target_type="User",
            target_id=sponsor.pk,
            target_label=sponsor.email,
            metadata={"motivo": motivo} if not aprobado else {},
            request=request,
        )
        return Response(UserSerializer(sponsor).data)
