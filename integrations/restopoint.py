"""Cliente RestoPoint: catálogo de restaurantes (REST + X-API-Key)."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

from integrations.partner_frontends import restopoint_restaurant_url

logger = logging.getLogger(__name__)

CACHE_TTL = 60  # 1 min — rate limit 60/min


class RestoPointError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _configured() -> bool:
    return bool((getattr(settings, "RESTOPOINT_API_KEY", "") or "").strip())


def _base_url() -> str:
    return getattr(
        settings,
        "RESTOPOINT_BASE_URL",
        "https://restaurants-backend-ni6d.onrender.com/api/v1/developer-api",
    ).rstrip("/")


def _headers() -> dict[str, str]:
    key = (getattr(settings, "RESTOPOINT_API_KEY", "") or "").strip()
    return {
        "X-API-Key": key,
        "Accept": "application/json",
    }


def _request(path: str, params: dict[str, Any] | None = None) -> Any:
    if not _configured():
        raise RestoPointError(
            "RestoPoint no está configurado (RESTOPOINT_API_KEY).",
            status_code=503,
        )
    url = f"{_base_url()}{path}"
    try:
        response = requests.get(
            url,
            headers=_headers(),
            params=params or None,
            timeout=float(getattr(settings, "RESTOPOINT_TIMEOUT_SECONDS", 15)),
        )
    except requests.RequestException as exc:
        logger.warning("RestoPoint network error: %s", exc)
        raise RestoPointError(
            "No se pudo contactar el catálogo RestoPoint.",
            status_code=502,
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise RestoPointError(
            "Respuesta inválida de RestoPoint.",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        msg = "Error al consultar RestoPoint."
        if isinstance(body, dict):
            msg = str(
                body.get("message")
                or body.get("detail")
                or body.get("error")
                or msg
            )
        raise RestoPointError(msg, status_code=response.status_code)

    return body


def _normalize_restaurant(raw: dict) -> dict[str, Any]:
    try:
        lat = float(raw["latitude"]) if raw.get("latitude") is not None else None
    except (TypeError, ValueError):
        lat = None
    try:
        lng = float(raw["longitude"]) if raw.get("longitude") is not None else None
    except (TypeError, ValueError):
        lng = None

    cover = (
        raw.get("coverImageUrl")
        or raw.get("cover_image_url")
        or raw.get("image_url")
        or raw.get("image")
        or ""
    )
    logo = raw.get("logoUrl") or raw.get("logo_url") or ""

    return {
        "id": raw.get("id"),
        "name": raw.get("name") or "",
        "slug": raw.get("slug") or "",
        "description": raw.get("description") or "",
        "address": raw.get("address") or "",
        "district": raw.get("district") or "",
        "city": raw.get("city") or "",
        "region": raw.get("region") or "",
        "latitude": lat,
        "longitude": lng,
        "avg_rating": raw.get("avgRating") if raw.get("avgRating") is not None else raw.get("avg_rating"),
        "total_capacity": raw.get("totalCapacity")
        if raw.get("totalCapacity") is not None
        else raw.get("total_capacity"),
        "cover_image_url": str(cover).strip() or None,
        "logo_url": str(logo).strip() or None,
        "image_url": str(cover).strip() or str(logo).strip() or None,
        "maps_url": (
            f"https://www.google.com/maps?q={lat},{lng}"
            if lat is not None and lng is not None
            else None
        ),
        "external_url": restopoint_restaurant_url(
            raw.get("slug") or "",
            restaurant_id=raw.get("id"),
        ),
        "source": "restopoint",
    }


def list_restaurants(*, page: int = 0, size: int = 50) -> dict[str, Any]:
    """Lista paginada (page base 0 según RestoPoint)."""
    page = max(0, int(page))
    size = max(1, min(int(size), 100))
    cache_key = (
        "restopoint:restaurants:"
        + hashlib.md5(
            json.dumps({"page": page, "size": size}, sort_keys=True).encode()
        ).hexdigest()
    )
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    body = _request("/restaurants", params={"page": page, "size": size})
    data = body.get("data") if isinstance(body, dict) else None
    if not isinstance(data, dict):
        data = {}
    content = data.get("content") if isinstance(data.get("content"), list) else []
    restaurants = [
        _normalize_restaurant(row) for row in content if isinstance(row, dict)
    ]
    payload = {
        "restaurants": restaurants,
        "count": int(data.get("totalElements") or len(restaurants)),
        "page": page,
        "size": size,
        "provider": "restopoint",
        "success": bool(body.get("success", True)) if isinstance(body, dict) else True,
    }
    cache.set(cache_key, payload, CACHE_TTL)
    return payload


def get_restaurant(restaurant_id: str) -> dict[str, Any]:
    rid = (restaurant_id or "").strip()
    if not rid:
        raise RestoPointError("ID de restaurante requerido.", status_code=400)

    cache_key = f"restopoint:restaurant:{hashlib.md5(rid.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    body = _request(f"/restaurants/{rid}")
    raw = body.get("data") if isinstance(body, dict) else None
    if isinstance(raw, dict) and "content" not in raw and raw.get("id"):
        restaurant = _normalize_restaurant(raw)
    elif isinstance(raw, dict) and isinstance(raw.get("content"), list) and raw["content"]:
        restaurant = _normalize_restaurant(raw["content"][0])
    elif isinstance(body, dict) and body.get("id"):
        restaurant = _normalize_restaurant(body)
    else:
        raise RestoPointError("Restaurante no encontrado.", status_code=404)

    cache.set(cache_key, restaurant, CACHE_TTL)
    return restaurant
