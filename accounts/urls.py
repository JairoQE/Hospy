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
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("perfil/", views.PerfilView.as_view(), name="perfil"),
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
