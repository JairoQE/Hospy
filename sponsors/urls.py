from django.urls import path

from sponsors import views

app_name = "sponsors"

urlpatterns = [
    path("config/", views.SponsorContactConfigView.as_view(), name="config"),
    path("activos/", views.ActiveAdsPublicView.as_view(), name="activos"),
    path("reportados/", views.SponsorAdReportsAdminView.as_view(), name="reportados"),
    path(
        "reportados/<int:pk>/resolver/",
        views.SponsorAdReportResolveView.as_view(),
        name="reporte-resolver",
    ),
    path("<int:pk>/reportar/", views.SponsorAdReportView.as_view(), name="reportar"),
]

urlpatterns_mine = [
    path("", views.MySponsorAdsView.as_view(), name="mis-anuncios"),
    path("<int:pk>/", views.MySponsorAdDetailView.as_view(), name="mis-anuncio-detalle"),
]
