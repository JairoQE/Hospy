import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

_USE_CLOUDINARY = os.environ.get("USE_CLOUDINARY", "").lower() in ("true", "1", "yes")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
]
if _USE_CLOUDINARY:
    INSTALLED_APPS.append("cloudinary_storage")
INSTALLED_APPS.append("django.contrib.staticfiles")
if _USE_CLOUDINARY:
    INSTALLED_APPS.append("cloudinary")
INSTALLED_APPS.extend(
    [
        # Terceros
        "rest_framework",
        "rest_framework_simplejwt",
        "django_filters",
        "corsheaders",
        "drf_spectacular",
        # Apps Hospy
        "accounts",
        "properties",
        "rooms",
        "bookings",
        "reviews",
        "notifications",
        "messaging",
        "hospix",
        "sponsors",
        "site_ui",
        "audit",
        "payments",
        "integrations",
    ]
)

# Pagos (mock / Culqi / Mercado Pago)
PAYMENTS_GATEWAY = os.environ.get("PAYMENTS_GATEWAY", "mock").strip().lower()
CULQI_SECRET_KEY = os.environ.get("CULQI_SECRET_KEY", "").strip()
CULQI_PUBLIC_KEY = os.environ.get("CULQI_PUBLIC_KEY", "").strip()
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", "").strip()
MP_PUBLIC_KEY = os.environ.get("MP_PUBLIC_KEY", "").strip()
PAYMENT_EXPIRY_MINUTES = int(os.environ.get("PAYMENT_EXPIRY_MINUTES", "30"))

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

AUTH_USER_MODEL = "accounts.User"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

_db_sslmode = os.environ.get("POSTGRES_SSLMODE", "prefer").strip()

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "hospy"),
        "USER": os.environ.get("POSTGRES_USER", "hospy"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "hospy_secret"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "OPTIONS": {"sslmode": _db_sslmode} if _db_sslmode else {},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Lima"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

from config.storage import build_storages  # noqa: E402

STORAGES = build_storages(MEDIA_ROOT, MEDIA_URL)

if _USE_CLOUDINARY:
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
        "API_KEY": os.environ.get("CLOUDINARY_API_KEY", ""),
        "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET", ""),
        "SECURE": True,
    }

# Límites de imágenes (RF-11, RF-22)
MAX_UPLOAD_IMAGE_SIZE_MB = int(os.environ.get("MAX_UPLOAD_IMAGE_SIZE_MB", "5"))
IMAGE_WEBP_QUALITY = int(os.environ.get("IMAGE_WEBP_QUALITY", "85"))
MAX_UPLOAD_VIDEO_SIZE_MB = int(os.environ.get("MAX_UPLOAD_VIDEO_SIZE_MB", "15"))
MAX_SPONSOR_AD_DURATION_SEC = int(os.environ.get("MAX_SPONSOR_AD_DURATION_SEC", "10"))
HOSPY_ADMIN_WHATSAPP = os.environ.get("HOSPY_ADMIN_WHATSAPP", "51123456789")
MAX_ACCOMMODATION_PHOTOS = 10
MAX_ROOM_PHOTOS = 5

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "300/min",
        "auth": "10/min",
    },
}

INTEGRATION_CACHE_TIMEOUT = int(os.environ.get("INTEGRATION_CACHE_TIMEOUT", "300"))

# Sesión: activa hasta cerrar sesión; tokens expiran tras ~30 min sin renovar (inactividad en cliente).
_JWT_ACCESS_MINUTES = int(os.environ.get("JWT_ACCESS_MINUTES", "30"))
_JWT_REFRESH_MINUTES = int(os.environ.get("JWT_REFRESH_MINUTES", "30"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=_JWT_ACCESS_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=_JWT_REFRESH_MINUTES),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
}

_API_PUBLIC_HOST = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost:8000").split(",")[0].strip()
_API_PUBLIC_SCHEME = (
    "https"
    if os.environ.get("DJANGO_SETTINGS_MODULE", "").endswith("production")
    else "http"
)

SPECTACULAR_SETTINGS = {
    "TITLE": "Hospy API",
    "DESCRIPTION": (
        "API REST de **Hospy**: búsqueda y reserva de hoteles, hostales y hospedajes en Perú.\n\n"
        "## Autenticación\n"
        "La mayoría de endpoints requieren JWT. Obtén tokens con `POST /api/v1/auth/login/` "
        "y envía el header `Authorization: Bearer <access_token>`.\n\n"
        "Renueva el access token con `POST /api/v1/auth/token/refresh/` y el refresh token.\n\n"
        "## Convenciones\n"
        "- Prefijo base: `/api/v1/`\n"
        "- Paginación: `?page=` (20 ítems por página)\n"
        "- Fechas: formato ISO `YYYY-MM-DD`\n"
        "- Montos: soles peruanos (`PEN`)\n\n"
        "## Documentación interactiva\n"
        "- [Swagger UI](/api/docs/)\n"
        "- [ReDoc](/api/redoc/)\n"
        "- [Esquema OpenAPI](/api/schema/)"
    ),
    "VERSION": "1.0.0",
    "CONTACT": {
        "name": "Equipo Hospy",
        "url": os.environ.get("FRONTEND_URL", "https://hospy.pages.dev"),
    },
    "LICENSE": {"name": "Uso interno — proyecto académico"},
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]",
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": False,
    "TAGS": [],  # se rellena al importar settings
    "POSTPROCESSING_HOOKS": ["config.openapi.assign_operation_tags"],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
        "tryItOutEnabled": True,
    },
    "SERVERS": [
        {"url": f"{_API_PUBLIC_SCHEME}://{_API_PUBLIC_HOST}", "description": "Entorno actual"},
        {"url": "http://localhost:8000", "description": "Desarrollo local"},
        {"url": "https://hospy-api.onrender.com", "description": "Producción (Render)"},
    ],
    "AUTHENTICATION_WHITELIST": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

from config.openapi import OPENAPI_TAGS  # noqa: E402

SPECTACULAR_SETTINGS["TAGS"] = OPENAPI_TAGS

# --- CORS ---
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

# --- Redis / Caché ---
# Redis solo si REDIS_URL apunta a un host real (Docker local o Upstash).
# En Render free sin Redis: no definir REDIS_URL, o production ignora localhost.
_redis_url = os.environ.get("REDIS_URL", "").strip()
_is_production = os.environ.get("DJANGO_SETTINGS_MODULE", "").endswith("production")
_use_redis = bool(
    _redis_url
    and (
        not _is_production
        or ("localhost" not in _redis_url and "127.0.0.1" not in _redis_url)
    )
)

if _use_redis:
    REDIS_URL = _redis_url
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        },
        "hospix": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "hospix-chat-sessions",
            "OPTIONS": {"MAX_ENTRIES": 300},
        },
    }
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", _redis_url.replace("/0", "/1"))
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_BROKER_URL", _redis_url.replace("/0", "/1"))
else:
    REDIS_URL = ""
    CACHES = {
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
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "django-cache"
    CELERY_TASK_ALWAYS_EAGER = os.environ.get(
        "CELERY_TASK_ALWAYS_EAGER", "true"
    ).lower() in ("true", "1", "yes")
    CELERY_TASK_EAGER_PROPAGATES = True

# --- Celery ---
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 60 * 5
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "complete-past-bookings-daily": {
        "task": "bookings.complete_past_bookings",
        "schedule": crontab(hour=3, minute=0),
        "options": {"expires": 3600},
    },
    "audit-retention-daily": {
        "task": "audit.run_retention_cycle",
        "schedule": crontab(hour=4, minute=0),
        "options": {"expires": 3600},
    },
}

# --- Auditoría ---
# Días en tabla activa antes de archivar (0 = no archivar automáticamente)
AUDIT_LOG_RETENTION_DAYS = int(os.environ.get("AUDIT_LOG_RETENTION_DAYS", "90"))
# Días que se conservan archivados antes de eliminar (0 = conservar indefinidamente)
AUDIT_LOG_PURGE_ARCHIVED_DAYS = int(os.environ.get("AUDIT_LOG_PURGE_ARCHIVED_DAYS", "365"))

# --- CAPTCHA (Cloudflare Turnstile) — login y registro ---
# Si TURNSTILE_SECRET_KEY está vacío, el CAPTCHA queda desactivado (útil en desarrollo).
TURNSTILE_SITE_KEY = os.environ.get("TURNSTILE_SITE_KEY", "")
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")

# --- Reseñas ---
# true = publicar al enviar (recomendado en local). false = moderación admin en /api/v1/resenas/pendientes/
REVIEWS_AUTO_APPROVE = os.environ.get("REVIEWS_AUTO_APPROVE", "true").lower() in (
    "true",
    "1",
    "yes",
)

# --- Integración ip.guide (geolocalización por IP) ---
IP_GUIDE_ENABLED = os.environ.get("IP_GUIDE_ENABLED", "true").lower() in (
    "true",
    "1",
    "yes",
)
IP_GUIDE_API_TEMPLATE = os.environ.get("IP_GUIDE_API_TEMPLATE", "https://ip.guide/{ip}")
IP_GUIDE_API_KEY = os.environ.get("IP_GUIDE_API_KEY", "").strip()
IP_GUIDE_CACHE_SECONDS = int(os.environ.get("IP_GUIDE_CACHE_SECONDS", "86400"))
IP_GUIDE_TIMEOUT_SECONDS = float(os.environ.get("IP_GUIDE_TIMEOUT_SECONDS", "4"))

# --- Integración SIST ---
HOSPY_INTEGRATION_API_KEY = os.environ.get("HOSPY_INTEGRATION_API_KEY", "")

# --- Email ---
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@hospy.local")
