from django.urls import path

from . import views

app_name = "organizations"

urlpatterns = [
    path("empresas/mia/", views.MyOrganizationView.as_view(), name="empresa-mia"),
    path(
        "empresas/mia/ruc/consultar/",
        views.OrganizationRucLookupView.as_view(),
        name="empresa-ruc-consultar",
    ),
    path(
        "empresas/mia/ruc/verificar/",
        views.OrganizationRucVerifyView.as_view(),
        name="empresa-ruc-verificar",
    ),
    path(
        "empresas/<slug:slug>/",
        views.OrganizationPublicView.as_view(),
        name="empresa-publica",
    ),
]
