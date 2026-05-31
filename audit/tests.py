import pytest


@pytest.mark.django_db
def test_audit_log_on_assign_admin(api_client, admin_user, huesped):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        f"/api/v1/auth/admin-usuarios/{huesped.id}/administrador/",
        {"admin": True},
        format="json",
    )
    assert response.status_code == 200

    from audit.models import AuditLog

    log = AuditLog.objects.filter(action="user.assign_admin").first()
    assert log is not None
    assert log.actor_id == admin_user.id
    assert log.target_id == huesped.id


@pytest.mark.django_db
def test_audit_logs_solo_admin(api_client, admin_user, huesped):
    api_client.force_authenticate(user=huesped)
    response = api_client.get("/api/v1/audit-logs/")
    assert response.status_code == 403

    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/v1/audit-logs/")
    assert response.status_code == 200
    assert "results" in response.data
    if response.data["results"]:
        row = response.data["results"][0]
        assert "severity" in row
        assert "category" in row


@pytest.mark.django_db
def test_audit_logs_resumen(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/v1/audit-logs/resumen/")
    assert response.status_code == 200
    assert "total" in response.data
    assert "critical_events" in response.data


@pytest.mark.django_db
def test_audit_logs_alertas(api_client, admin_user, huesped):
    from audit.models import AuditLog
    from audit.services import log_action

    log_action(actor=admin_user, action="user.assign_admin", target_type="user", target_id=huesped.id)

    api_client.force_authenticate(user=huesped)
    assert api_client.get("/api/v1/audit-logs/alertas/").status_code == 403

    api_client.force_authenticate(user=admin_user)
    baseline = api_client.get("/api/v1/audit-logs/alertas/")
    assert baseline.status_code == 200
    assert baseline.data["count"] == 0
    assert baseline.data["latest_id"] >= 1

    last_id = AuditLog.objects.order_by("-id").values_list("id", flat=True).first()
    log_action(actor=admin_user, action="profile.change_password", target_type="user", target_id=admin_user.id)
    response = api_client.get(f"/api/v1/audit-logs/alertas/?after_id={last_id}")
    assert response.status_code == 200
    assert response.data["count"] >= 1
    assert response.data["alerts"][0]["severity"] == "critical"


@pytest.mark.django_db
def test_audit_retention(api_client, admin_user, settings):
    from datetime import timedelta

    from django.utils import timezone

    from audit.models import AuditLog
    from audit.services import log_action

    settings.AUDIT_LOG_RETENTION_DAYS = 30
    settings.AUDIT_LOG_PURGE_ARCHIVED_DAYS = 60

    log_action(actor=admin_user, action="profile.update", target_type="user", target_id=admin_user.id)
    old = AuditLog.objects.first()
    AuditLog.objects.filter(pk=old.pk).update(
        created_at=timezone.now() - timedelta(days=45),
    )

    api_client.force_authenticate(user=admin_user)
    info = api_client.get("/api/v1/audit-logs/retencion/")
    assert info.status_code == 200
    assert info.data["expired_pending_archive"] >= 1

    run = api_client.post("/api/v1/audit-logs/retencion/ejecutar/")
    assert run.status_code == 200
    assert run.data["archived"] >= 1
    assert AuditLog.objects.filter(pk=old.pk, is_archived=True).exists()
