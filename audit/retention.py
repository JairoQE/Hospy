from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import AuditLog


def retention_days() -> int:
    return max(0, int(getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 90)))


def purge_archived_days() -> int:
    return max(0, int(getattr(settings, "AUDIT_LOG_PURGE_ARCHIVED_DAYS", 365)))


def active_queryset():
    return AuditLog.objects.filter(is_archived=False)


def archived_queryset():
    return AuditLog.objects.filter(is_archived=True)


def expired_active_queryset():
    days = retention_days()
    if days <= 0:
        return AuditLog.objects.none()
    cutoff = timezone.now() - timedelta(days=days)
    return active_queryset().filter(created_at__lt=cutoff)


def expired_archived_queryset():
    days = purge_archived_days()
    if days <= 0:
        return AuditLog.objects.none()
    cutoff = timezone.now() - timedelta(days=days)
    return archived_queryset().filter(created_at__lt=cutoff)


def archive_expired_logs() -> int:
    return expired_active_queryset().update(is_archived=True)


def purge_expired_archived_logs() -> int:
    qs = expired_archived_queryset()
    count, _ = qs.delete()
    return count


def run_retention_cycle() -> dict[str, int]:
    archived = archive_expired_logs()
    purged = purge_expired_archived_logs()
    return {"archived": archived, "purged": purged}


def retention_stats() -> dict:
    days = retention_days()
    purge_days = purge_archived_days()
    return {
        "retention_days": days,
        "purge_archived_days": purge_days,
        "active_count": active_queryset().count(),
        "archived_count": archived_queryset().count(),
        "expired_pending_archive": expired_active_queryset().count(),
        "archived_pending_purge": expired_archived_queryset().count(),
    }
