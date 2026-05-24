import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("hospy")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Tareas en el paquete config (no es una app Django instalada)
import config.tasks  # noqa: E402, F401
