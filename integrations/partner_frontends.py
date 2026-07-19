"""URLs públicas de los frontends de sistemas integrados (CIn-3)."""

from __future__ import annotations

from django.conf import settings


def _base(setting_name: str, default: str) -> str:
    return (getattr(settings, setting_name, "") or default).rstrip("/")


def actify_event_url(event_id: str | int | None) -> str | None:
    if event_id in (None, ""):
        return None
    base = _base("ACTIFY_FRONTEND_URL", "https://actify.qd.je")
    return f"{base}/events/{event_id}"


def restopoint_restaurant_url(
    slug: str | None = None,
    *,
    restaurant_id: str | int | None = None,
) -> str | None:
    """Detalle público RestoPoint: /restaurants/{slug} (no UUID)."""
    from urllib.parse import quote

    key = (str(slug).strip() if slug not in (None, "") else "") or (
        str(restaurant_id).strip() if restaurant_id not in (None, "") else ""
    )
    if not key:
        return None
    base = _base(
        "RESTOPOINT_FRONTEND_URL",
        "https://restaurants-seven-tan.vercel.app",
    )
    return f"{base}/restaurants/{quote(key, safe='')}"


def conecta_tingo_place_url(place_id: str | int | None) -> str | None:
    """Detalle público: https://conectatingo.com/lugares/{id}."""
    base = _base("CONECTA_TINGO_FRONTEND_URL", "https://conectatingo.com")
    if place_id in (None, ""):
        return f"{base}/lugares"
    return f"{base}/lugares/{place_id}"
