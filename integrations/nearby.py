"""Agrega restaurantes, lugares turísticos y eventos cerca de un punto."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

from django.core.cache import cache

from integrations.partner_frontends import (
    actify_event_url,
    conecta_tingo_place_url,
    restopoint_restaurant_url,
)
from properties.services import haversine_km

logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 25.0
CACHE_TTL = 90
MAX_ITEMS = 8


def _dist_item(
    lat: float,
    lng: float,
    item_lat: Any,
    item_lng: Any,
    radio_km: float,
) -> float | None:
    try:
        ilat = float(item_lat)
        ilng = float(item_lng)
    except (TypeError, ValueError):
        return None
    dist = haversine_km(lat, lng, ilat, ilng)
    if dist > radio_km:
        return None
    return round(dist, 2)


def _nearby_restaurants(lat: float, lng: float, radio_km: float, city: str) -> list[dict]:
    try:
        from integrations.restopoint import RestoPointError, list_restaurants
    except Exception:
        return []
    try:
        payload = list_restaurants(page=0, size=50)
    except RestoPointError:
        return []
    except Exception as exc:
        logger.warning("nearby restaurants: %s", exc)
        return []

    city_norm = (city or "").strip().lower()
    results: list[dict] = []
    for row in payload.get("restaurants") or []:
        dist = _dist_item(lat, lng, row.get("latitude"), row.get("longitude"), radio_km)
        if dist is None:
            # Fallback por ciudad si no hay coords útiles
            row_city = str(row.get("city") or "").strip().lower()
            if (
                not city_norm
                or not row_city
                or (city_norm not in row_city and row_city not in city_norm)
            ):
                continue
        results.append(
            {
                "kind": "restaurant",
                "id": row.get("id"),
                "name": row.get("name") or "Restaurante",
                "subtitle": " · ".join(
                    p for p in (row.get("district"), row.get("city")) if p
                ),
                "address": row.get("address") or "",
                "distance_km": dist,
                "rating": row.get("avg_rating"),
                "image_url": row.get("image_url") or row.get("cover_image_url"),
                "href": f"/restaurantes/{row.get('id')}" if row.get("id") else "/restaurantes",
                "external_url": restopoint_restaurant_url(
                    row.get("slug") or "",
                    restaurant_id=row.get("id"),
                ),
                "provider_label": "RestoPoint",
                "source": "restopoint",
            }
        )
    results.sort(
        key=lambda x: (
            x["distance_km"] is None,
            x["distance_km"] if x["distance_km"] is not None else 999,
        )
    )
    return results[:MAX_ITEMS]


def _nearby_places(lat: float, lng: float, radio_km: float) -> list[dict]:
    try:
        from integrations.conecta_tingo import ConectaTingoError, list_hotspots
    except Exception:
        return []
    try:
        spots = list_hotspots(limit=40)
    except ConectaTingoError:
        return []
    except Exception as exc:
        logger.warning("nearby places: %s", exc)
        return []

    results: list[dict] = []
    for spot in spots:
        dist = _dist_item(lat, lng, spot.get("latitude"), spot.get("longitude"), radio_km)
        if dist is None:
            continue
        slug = spot.get("slug") or "lugar"
        public_id = spot.get("public_id")
        results.append(
            {
                "kind": "place",
                "id": slug,
                "name": spot.get("name") or "Lugar",
                "subtitle": spot.get("zone") or "",
                "address": spot.get("zone") or "",
                "distance_km": dist,
                "rating": None,
                "image_url": spot.get("image_url"),
                "entry_price": spot.get("entry_price") or "",
                "interest_level": spot.get("interest_level"),
                "latitude": spot.get("latitude"),
                "longitude": spot.get("longitude"),
                "href": f"/lugares/{quote(str(slug), safe='')}",
                "external_url": conecta_tingo_place_url(public_id),
                "provider_label": "Conecta Tingo",
                "source": "conecta_tingo",
            }
        )
    results.sort(key=lambda x: x["distance_km"] or 999)
    return results[:MAX_ITEMS]


def _nearby_events(lat: float, lng: float, radio_km: float, city: str) -> list[dict]:
    try:
        from integrations.actify import ActifyError, list_events
    except Exception:
        return []

    params: dict[str, Any] = {"per_page": 40}
    if city:
        params["city"] = city
        params["location"] = city
    try:
        payload = list_events(params=params)
    except ActifyError:
        try:
            payload = list_events(params={"per_page": 40})
        except Exception:
            return []
    except Exception as exc:
        logger.warning("nearby events: %s", exc)
        return []

    results: list[dict] = []
    for event in payload.get("events") or []:
        loc = event.get("location") or {}
        dist = _dist_item(lat, lng, loc.get("latitude"), loc.get("longitude"), radio_km)
        if dist is None:
            # si Actify filtró por ciudad, incluir aunque falte geo
            if not city:
                continue
            event_city = str(loc.get("city") or "").strip().lower()
            city_norm = city.strip().lower()
            if (
                not event_city
                or (city_norm not in event_city and event_city not in city_norm)
            ):
                continue
        results.append(
            {
                "kind": "event",
                "id": event.get("id"),
                "name": event.get("name") or "Evento",
                "subtitle": (event.get("category") or {}).get("name")
                or loc.get("city")
                or "",
                "address": loc.get("address") or loc.get("city") or "",
                "distance_km": dist,
                "rating": None,
                "image_url": event.get("image_url"),
                "start_date": event.get("start_date") or "",
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "href": f"/eventos/{event.get('id')}" if event.get("id") else "/eventos",
                "external_url": actify_event_url(event.get("id")),
                "provider_label": "Actify",
                "source": "actify",
            }
        )
    results.sort(
        key=lambda x: (
            x["distance_km"] is None,
            x["distance_km"] if x["distance_km"] is not None else 999,
        )
    )
    return results[:MAX_ITEMS]


def build_nearby_explore(
    *,
    lat: float,
    lng: float,
    radio_km: float = DEFAULT_RADIUS_KM,
    city: str = "",
) -> dict[str, Any]:
    radio_km = max(1.0, min(float(radio_km), 80.0))
    import hashlib

    city_key = hashlib.md5(city.strip().lower().encode()).hexdigest()[:10]
    cache_key = f"nearby:explore:{round(lat, 4)}:{round(lng, 4)}:{radio_km}:{city_key}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    payload = {
        "lat": lat,
        "lng": lng,
        "radio_km": radio_km,
        "city": city or "",
        "restaurantes": _nearby_restaurants(lat, lng, radio_km, city),
        "lugares": _nearby_places(lat, lng, radio_km),
        "eventos": _nearby_events(lat, lng, radio_km, city),
    }
    cache.set(cache_key, payload, CACHE_TTL)
    return payload
