"""Eventos Actify cercanos a un hospedaje (oportunidades de oferta)."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from properties.services import haversine_km

logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 25.0
DEFAULT_DISCOUNT = 15
MAX_EVENTS = 8


def _parse_day(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    text = str(value).strip()
    dt = parse_datetime(text)
    if dt:
        return timezone.localtime(dt).date() if timezone.is_aware(dt) else dt.date()
    d = parse_date(text[:10])
    return d


def _suggested_duration(start: date | None, end: date | None) -> int:
    if start and end and end >= start:
        return max(1, min(365, (end - start).days + 1))
    if start:
        return 3
    return 3


def nearby_events_for_accommodation(
    accommodation,
    *,
    radio_km: float = DEFAULT_RADIUS_KM,
    limit: int = MAX_EVENTS,
    notify: bool = False,
) -> list[dict[str, Any]]:
    """
    Lista eventos Actify cercanos al hospedaje, con sugerencia de oferta.

    Si notify=True, crea (con dedupe) una notificación in-app al propietario.
    """
    try:
        lat = float(accommodation.latitude)
        lng = float(accommodation.longitude)
    except (TypeError, ValueError):
        return []

    try:
        from integrations.actify import ActifyError, list_events
    except Exception:
        return []

    try:
        payload = list_events(params={"per_page": 40})
    except ActifyError:
        return []
    except Exception as exc:
        logger.warning("nearby events for offer: %s", exc)
        return []

    today = timezone.localdate()
    existing_event_ids = set(
        accommodation.ofertas.exclude(event_id=None).values_list("event_id", flat=True)
    )

    results: list[dict[str, Any]] = []
    for event in payload.get("events") or []:
        loc = event.get("location") or {}
        try:
            elat = float(loc.get("latitude"))
            elng = float(loc.get("longitude"))
        except (TypeError, ValueError):
            continue
        dist = haversine_km(lat, lng, elat, elng)
        if dist > radio_km:
            continue

        start = _parse_day(event.get("start_date"))
        end = _parse_day(event.get("end_date")) or start
        # Solo eventos futuros o en curso
        if end and end < today:
            continue

        eid = event.get("id")
        try:
            eid_int = int(eid) if eid is not None else None
        except (TypeError, ValueError):
            eid_int = None
        if eid_int is None:
            continue

        name = str(event.get("name") or f"Evento {eid_int}")
        duration = _suggested_duration(start, end)
        offer_start = start if start and start >= today else today
        results.append(
            {
                "event_id": eid_int,
                "name": name,
                "subtitle": (event.get("category") or {}).get("name")
                or loc.get("city")
                or "",
                "start_date": start.isoformat() if start else "",
                "end_date": end.isoformat() if end else "",
                "distance_km": round(dist, 2),
                "latitude": elat,
                "longitude": elng,
                "external_url": event.get("external_url"),
                "has_offer": eid_int in existing_event_ids,
                "suggested_offer": {
                    "title": f"Oferta evento: {name}"[:120],
                    "discount_percent": DEFAULT_DISCOUNT,
                    "start_date": offer_start.isoformat(),
                    "duration_days": duration,
                    "event_id": eid_int,
                    "event_name": name[:200],
                },
            }
        )

    results.sort(key=lambda row: (row["has_offer"], row["distance_km"] or 999))
    results = results[: max(0, int(limit))]

    if notify and results:
        _maybe_notify_owner(accommodation, results)

    return results


def _maybe_notify_owner(accommodation, events: list[dict[str, Any]]) -> None:
    owner = getattr(accommodation, "owner", None)
    if owner is None:
        return
    from notifications.models import InboxItem
    from notifications.services import notify_user

    for event in events:
        if event.get("has_offer"):
            continue
        eid = event["event_id"]
        kind = f"event_offer_hint:{accommodation.id}:{eid}"
        if InboxItem.objects.filter(recipient=owner, kind=kind).exists():
            continue
        dist = event.get("distance_km")
        when = event.get("start_date") or "próximamente"
        notify_user(
            owner,
            title=f"Evento cerca: {event['name']}",
            body=(
                f"Hay un evento a {dist} km de «{accommodation.name}» "
                f"(inicio {when}). Crea una oferta para atraer más reservas."
            ),
            link=f"/propietario/hospedajes/{accommodation.id}/editar#ofertas",
            kind=kind,
        )
