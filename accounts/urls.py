from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "accounts"

urlpatterns = [
    path("registro/", views.RegisterView.as_view(), name="registro"),
    path(
        "registro-propietario/",
        views.RegisterPropietarioView.as_view(),
        name="registro-propietario",
    ),
    path(
        "registro-patrocinador/",
        views.RegisterPatrocinadorView.as_view(),
        name="registro-patrocinador",
    ),
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("perfil/", views.PerfilView.as_view(), name="perfil"),
    path("usuarios/<int:pk>/", views.PublicUserProfileView.as_view(), name="usuario-publico"),
    path("usuarios/<int:pk>/seguir/", views.FollowUserView.as_view(), name="usuario-seguir"),
    path(
        "anfitriones/<int:pk>/",
        views.OwnerStoreView.as_view(),
        name="anfitrion-tienda",
    ),
    path(
        "propietarios-pendientes/",
        views.PropietariosPendientesView.as_view(),
        name="propietarios-pendientes",
    ),
    path(
        "propietarios/<int:pk>/aprobar/",
        views.PropietarioAprobarView.as_view(),
        name="propietario-aprobar",
    ),
    path(
        "patrocinadores-pendientes/",
        views.PatrocinadoresPendientesView.as_view(),
        name="patrocinadores-pendientes",
    ),
    path(
        "patrocinadores/<int:pk>/aprobar/",
        views.PatrocinadorAprobarView.as_view(),
        name="patrocinador-aprobar",
    ),
    path(
        "reset-password/",
        views.PasswordResetRequestView.as_view(),
        name="reset-password",
    ),
    path(
        "reset-password/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="reset-password-confirm",
    ),
]
