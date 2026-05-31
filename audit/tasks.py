from celery import shared_task

from .retention import run_retention_cycle


@shared_task(name="audit.run_retention_cycle")
def run_audit_retention_cycle_task() -> dict[str, int]:
    """Archiva registros vencidos y elimina archivados antiguos (Celery Beat)."""
    return run_retention_cycle()
