"""Archiva registros de auditoría vencidos y purga archivados antiguos."""

from django.core.management.base import BaseCommand

from audit.retention import retention_stats, run_retention_cycle


class Command(BaseCommand):
    help = "Archiva logs vencidos según AUDIT_LOG_RETENTION_DAYS y purga archivados antiguos."

    def handle(self, *args, **options):
        before = retention_stats()
        result = run_retention_cycle()
        after = retention_stats()
        self.stdout.write(
            self.style.SUCCESS(
                f"Archivados: {result['archived']} · Eliminados: {result['purged']} · "
                f"Activos: {after['active_count']} · Archivados: {after['archived_count']}"
            )
        )
        if before["expired_pending_archive"] == 0 and result["archived"] == 0:
            self.stdout.write("No había registros pendientes de archivar.")
