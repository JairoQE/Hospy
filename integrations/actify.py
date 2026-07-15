"""Cliente Actify: catálogo público de eventos (REST + Bearer API Key)."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_TTL = 60  # 1 min — respeta rate limit (~100/min) y frescura de aforo


class ActifyError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _configured() -> bool:
    return bool((getattr(settings, "ACTIFY_API_KEY", "") or "").strip())


def _base_url() -> str:
    return getattr(settings, "ACTIFY_BASE_URL", "https://actify.qd.je/api/v1").rstrip("/")


def _headers() -> dict[str, str]:
    key = (getattr(settings, "ACTIFY_API_KEY", "") or "").strip()
    return {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }


def _request(path: str, params: dict[str, Any] | None = None) -> Any:
    if not _configured():
        raise ActifyError(
            "Actify no está configurado (ACTIFY_API_KEY).",
            status_code=503,
        )
    url = f"{_base_url()}{path}"
    try:
        response = requests.get(
            url,
            headers=_headers(),
            params=params or None,
            timeout=float(getattr(settings, "ACTIFY_TIMEOUT_SECONDS", 12)),
        )
    except requests.RequestException as exc:
        logger.warning("Actify network error: %s", exc)
        raise ActifyError(
            "No se pudo contactar el catálogo de eventos Actify.",
            status_code=502,
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise ActifyError(
            "Respuesta inválida de Actify.",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        msg = "Error al consultar Actify."
        if isinstance(body, dict):
            msg = str(body.get("message") or body.get("detail") or msg)
        raise ActifyError(msg, status_code=response.status_code)

    return body


def _normalize_event(raw: dict) -> dict[str, Any]:
    capacity = raw.get("capacity") if isinstance(raw.get("capacity"), dict) else {}
    location = raw.get("location") if isinstance(raw.get("location"), dict) else {}
    category = raw.get("category") if isinstance(raw.get("category"), dict) else {}
    organizer = raw.get("organizer") if isinstance(raw.get("organizer"), dict) else {}
    tickets = raw.get("ticket_types") if isinstance(raw.get("ticket_types"), list) else []

    return {
        "id": raw.get("id"),
        "name": raw.get("name") or "",
        "description": raw.get("description") or "",
        "start_date": raw.get("start_date") or "",
        "end_date": raw.get("end_date") or "",
        "status": raw.get("status") or "",
        "capacity": {
            "max_capacity": capacity.get("max_capacity"),
            "sold_tickets": capacity.get("sold_tickets"),
            "available_spots": capacity.get("available_spots"),
            "is_sold_out": bool(capacity.get("is_sold_out")),
        },
        "location": {
            "city": location.get("city") or "",
            "address": location.get("address") or "",
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
        },
        "category": {
            "name": category.get("name") or "",
            "slug": category.get("slug") or "",
        },
        "organizer": {
            "name": organizer.get("name") or "",
        },
        "ticket_types": [
            {
                "name": t.get("name") or "",
                "price": t.get("price"),
                "currency": t.get("currency") or "PEN",
            }
            for t in tickets
            if isinstance(t, dict)
        ],
        "source": "actify",
    }


def _extract_events(body: Any) -> tuple[list[dict], dict[str, Any]]:
    """Soporta array plano o envoltorio paginado."""
    meta: dict[str, Any] = {}
    items: list = []
    if isinstance(body, list):
        items = body
    elif isinstance(body, dict):
        if isinstance(body.get("data"), list):
            items = body["data"]
        elif isinstance(body.get("results"), list):
            items = body["results"]
        elif isinstance(body.get("events"), list):
            items = body["events"]
        for key in ("page", "per_page", "total", "total_pages", "next", "previous", "count"):
            if key in body:
                meta[key] = body[key]
    events = [_normalize_event(x) for x in items if isinstance(x, dict)]
    return events, meta


def list_events(*, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Lista eventos públicos Actify.
    Query opcionales: category_id, location, radius, city, page, per_page.
    """
    clean: dict[str, Any] = {}
    for key, value in (params or {}).items():
        if value is None or value == "":
            continue
        clean[key] = value

    cache_key = (
        "actify:events:"
        + hashlib.md5(json.dumps(clean, sort_keys=True, default=str).encode()).hexdigest()
    )
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    body = _request("/events", clean)
    events, meta = _extract_events(body)
    # Solo publicados (defensa extra)
    events = [e for e in events if (e.get("status") or "").lower() in ("published", "publicado", "")]
    payload = {
        "events": events,
        "count": meta.get("total") or meta.get("count") or len(events),
        "meta": meta,
        "provider": "actify",
    }
    cache.set(cache_key, payload, CACHE_TTL)
    return payload


def get_event(event_id: int | str) -> dict[str, Any]:
    cache_key = f"actify:event:{event_id}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    body = _request(f"/events/{event_id}")
    if isinstance(body, dict) and isinstance(body.get("data"), dict):
        body = body["data"]
    if not isinstance(body, dict):
        raise ActifyError("Evento no encontrado.", status_code=404)
    event = _normalize_event(body)
    cache.set(cache_key, event, CACHE_TTL)
    return event
