from __future__ import annotations

from collections import Counter
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from audit.models import AuditLog
from bookings.models import Booking

from .models import IpSecurityAlert


def booking_origins_for_owner(owner_id: int, *, days: int = 30) -> dict:
    """Origen de reservas (país/ciudad) según ip_geo en auditoría booking.create."""
    since = timezone.now() - timedelta(days=days)
    booking_ids = list(
        Booking.objects.filter(
            room__accommodation__owner_id=owner_id,
            created_at__gte=since,
        ).values_list("id", flat=True)
    )
    if not booking_ids:
        return {
            "days": days,
            "total": 0,
            "by_country": [],
            "by_city": [],
            "international_percent": 0,
        }

    logs = AuditLog.objects.filter(
        action="booking.create",
        target_id__in=booking_ids,
        created_at__gte=since,
    )

    countries: Counter[str] = Counter()
    cities: Counter[str] = Counter()
    international = 0
    total = 0

    for log in logs:
        geo = (log.metadata or {}).get("ip_geo") or {}
        code = (geo.get("country_code") or "DES").upper()
        city = (geo.get("city") or "").strip()
        total += 1
        countries[code] += 1
        if city:
            cities[f"{city}, {code}"] += 1
        if code not in ("PE", "LOCAL", "DES"):
            international += 1

    if total == 0:
        total = len(booking_ids)

    return {
        "days": days,
        "total": total,
        "by_country": [
            {"country_code": k, "count": v, "percent": round(100 * v / total, 1)}
            for k, v in countries.most_common(10)
        ],
        "by_city": [
            {"label": k, "count": v, "percent": round(100 * v / total, 1)}
            for k, v in cities.most_common(12)
        ],
        "international_percent": round(100 * international / total, 1) if total else 0,
    }


def activity_map_for_admin(*, days: int = 7) -> dict:
    """Puntos agregados para mapa admin desde auditoría enriquecida."""
    since = timezone.now() - timedelta(days=days)
    qs = (
        AuditLog.objects.filter(created_at__gte=since)
        .exclude(metadata__ip_geo__latitude__isnull=True)
        .exclude(metadata__ip_geo__longitude__isnull=True)
    )

    buckets: dict[tuple, dict] = {}
    for log in qs.iterator():
        geo = (log.metadata or {}).get("ip_geo") or {}
        lat = geo.get("latitude")
        lon = geo.get("longitude")
        if lat is None or lon is None:
            continue
        try:
            lat_f = round(float(lat), 2)
            lon_f = round(float(lon), 2)
        except (TypeError, ValueError):
            continue
        key = (lat_f, lon_f)
        if key not in buckets:
            buckets[key] = {
                "latitude": lat_f,
                "longitude": lon_f,
                "city": geo.get("city") or "",
                "country_code": geo.get("country_code") or "",
                "count": 0,
                "actions": Counter(),
            }
        buckets[key]["count"] += 1
        buckets[key]["actions"][log.action] += 1

    points = []
    for bucket in buckets.values():
        top_actions = [
            {"action": a, "count": c}
            for a, c in bucket["actions"].most_common(3)
        ]
        points.append(
            {
                "latitude": bucket["latitude"],
                "longitude": bucket["longitude"],
                "city": bucket["city"],
                "country_code": bucket["country_code"],
                "count": bucket["count"],
                "top_actions": top_actions,
            }
        )
    points.sort(key=lambda p: p["count"], reverse=True)

    return {
        "days": days,
        "points": points[:200],
        "total_events": qs.count(),
    }


def security_alerts_summary(*, limit: int = 30, unresolved_only: bool = True) -> dict:
    qs = IpSecurityAlert.objects.select_related("user").order_by("-created_at")
    if unresolved_only:
        qs = qs.filter(is_resolved=False)
    rows = list(qs[:limit])
    by_kind = (
        IpSecurityAlert.objects.filter(is_resolved=False)
        .values("kind")
        .annotate(c=Count("id"))
    )
    return {
        "unresolved_total": IpSecurityAlert.objects.filter(is_resolved=False).count(),
        "by_kind": {row["kind"]: row["c"] for row in by_kind},
        "alerts": [
            {
                "id": a.pk,
                "kind": a.kind,
                "severity": a.severity,
                "message": a.message,
                "ip_address": a.ip_address,
                "user_email": a.user.email if a.user_id else "",
                "metadata": a.metadata,
                "created_at": a.created_at.isoformat(),
            }
            for a in rows
        ],
    }
