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
