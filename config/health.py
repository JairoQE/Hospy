from django.conf import settings
from django.core.cache import cache
from django.db import connection


def check_database() -> dict:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def check_cache() -> dict:
    try:
        cache.set("hospy_health", "1", 5)
        if cache.get("hospy_health") == "1":
            return {"status": "ok", "backend": settings.CACHES["default"]["BACKEND"]}
        return {"status": "error", "detail": "cache read failed"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def build_health_payload() -> dict:
    db = check_database()
    cache_status = check_cache()
    overall = (
        "ok" if db["status"] == "ok" and cache_status["status"] == "ok" else "degraded"
    )
    return {
        "status": overall,
        "service": "hospy",
        "version": "1.0.0",
        "checks": {
            "database": db,
            "cache": cache_status,
        },
    }
