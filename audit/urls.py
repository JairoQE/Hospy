from django.urls import path

from . import views

app_name = "audit"

urlpatterns = [
    path("audit-logs/", views.AuditLogListView.as_view(), name="audit-logs"),
    path("audit-logs/resumen/", views.AuditLogSummaryView.as_view(), name="audit-logs-summary"),
    path("audit-logs/alertas/", views.AuditLogAlertsView.as_view(), name="audit-logs-alerts"),
    path("audit-logs/retencion/", views.AuditLogRetentionView.as_view(), name="audit-logs-retention"),
    path(
        "audit-logs/retencion/ejecutar/",
        views.AuditLogRetentionRunView.as_view(),
        name="audit-logs-retention-run",
    ),
]
