import os

from .base import *  # noqa: F403

DEBUG = False
CORS_ALLOW_ALL_ORIGINS = False

if not SECRET_KEY or SECRET_KEY == "dev-only-insecure-key":  # noqa: F405
    raise ValueError("DJANGO_SECRET_KEY debe definirse en producción.")

# Render / reverse proxy terminan TLS delante de Gunicorn
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CSRF_TRUSTED_ORIGINS", os.environ.get("CORS_ALLOWED_ORIGINS", "")).split(",")
    if o.strip()
]

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Render free no incluye Redis — usar memoria local salvo REDIS_URL externo (Upstash, etc.)
_redis_url = os.environ.get("REDIS_URL", "").strip()
_use_external_redis = bool(
    _redis_url
    and "localhost" not in _redis_url
    and "127.0.0.1" not in _redis_url
)

if not _use_external_redis:
    CACHES = {  # noqa: F405
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "hospy-default-cache",
        },
        "hospix": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "hospix-chat-sessions",
            "OPTIONS": {"MAX_ENTRIES": 300},
        },
    }
    CELERY_TASK_ALWAYS_EAGER = True  # noqa: F405
    CELERY_TASK_EAGER_PROPAGATES = True  # noqa: F405
