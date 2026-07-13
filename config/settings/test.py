"""Settings para pytest: sin Redis ni PostgreSQL externos."""

import os

os.environ["USE_SQLITE"] = "true"
os.environ.setdefault("REDIS_URL", "")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")

from .development import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "hospy-test-cache",
    },
    "hospix": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "hospix-test-sessions",
        "OPTIONS": {"MAX_ENTRIES": 300},
    },
}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
