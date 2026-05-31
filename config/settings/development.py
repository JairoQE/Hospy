import os
from pathlib import Path

from dotenv import load_dotenv

# Cargar .env antes de base.py (DATABASES se define al importar base)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from .base import *  # noqa: F403

DEBUG = True

# Permisivo en desarrollo para probar desde Postman o frontend local
CORS_ALLOW_ALL_ORIGINS = not CORS_ALLOWED_ORIGINS  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Sin Docker: USE_SQLITE=1 en .env para arrancar rápido (PostgreSQL es el objetivo en producción)
if os.environ.get("USE_SQLITE", "").lower() in ("true", "1", "yes"):
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
        }
    }
    CACHES = {  # noqa: F405
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
        "hospix": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "hospix-chat-sessions",
            "OPTIONS": {"MAX_ENTRIES": 300},
        },
    }
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    # Con PostgreSQL + Redis: emails y tareas en segundo plano (requiere worker Celery)
    CELERY_TASK_ALWAYS_EAGER = os.environ.get(
        "CELERY_TASK_ALWAYS_EAGER", ""
    ).lower() in ("true", "1", "yes")
