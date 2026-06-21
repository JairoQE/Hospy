from __future__ import annotations

from collections import Counter, defaultdict
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


_COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "PE": (-9.19, -75.02),
    "US": (39.83, -98.58),
    "CA": (56.13, -106.35),
    "DE": (51.17, 10.45),
    "FI": (61.92, 25.75),
    "ES": (40.46, -3.75),
    "MX": (23.63, -102.55),
    "BR": (-14.24, -51.93),
    "AR": (-38.42, -63.62),
    "CL": (-35.68, -71.54),
    "CO": (4.57, -74.30),
    "FR": (46.23, 2.21),
    "GB": (55.38, -3.44),
    "IT": (41.87, 12.57),
}


def _resolve_pe_department(city: str) -> str | None:
    city = (city or "").strip()
    if not city:
        return None
    from properties.ubigeo_loader import resolve_departamento, search_places

    direct = resolve_departamento(city)
    if direct:
        return direct["nombre"]

    matches = search_places(city, limit=3)
    for place in matches:
        dept = (place.get("departamento") or "").strip()
        if dept:
            return dept
    return None


def _depto_code(name: str) -> str:
    from properties.ubigeo_loader import resolve_departamento

    row = resolve_departamento(name)
    return row["codigo"] if row else ""


def activity_map_for_admin(*, days: int = 7) -> dict:
    """Agregados para mapa admin: países, departamentos (PE), ciudades y línea temporal."""
    since = timezone.now() - timedelta(days=days)
    qs = AuditLog.objects.filter(created_at__gte=since)

    countries: Counter[str] = Counter()
    country_names: dict[str, str] = {}
    country_lat_sum: dict[str, float] = defaultdict(float)
    country_lon_sum: dict[str, float] = defaultdict(float)
    country_geo_n: dict[str, int] = defaultdict(int)

    departments: Counter[str] = Counter()
    dept_lat_sum: dict[str, float] = defaultdict(float)
    dept_lon_sum: dict[str, float] = defaultdict(float)
    dept_geo_n: dict[str, int] = defaultdict(int)

    timeline: Counter[str] = Counter()
    buckets: dict[tuple[float, float], dict] = {}

    for log in qs.iterator():
        timeline[log.created_at.date().isoformat()] += 1
        geo = (log.metadata or {}).get("ip_geo") or {}
        code = (geo.get("country_code") or "DES").upper()
        city = (geo.get("city") or "").strip()
        countries[code] += 1
        if geo.get("country"):
            country_names[code] = geo["country"]

        lat = geo.get("latitude")
        lon = geo.get("longitude")
        department = ""
        if code == "PE" and city:
            department = _resolve_pe_department(city) or ""

        if department:
            departments[department] += 1

        if lat is None or lon is None:
            continue
        try:
            lat_f = round(float(lat), 2)
            lon_f = round(float(lon), 2)
        except (TypeError, ValueError):
            continue

        country_lat_sum[code] += lat_f
        country_lon_sum[code] += lon_f
        country_geo_n[code] += 1

        if department:
            dept_lat_sum[department] += lat_f
            dept_lon_sum[department] += lon_f
            dept_geo_n[department] += 1

        key = (lat_f, lon_f)
        if key not in buckets:
            buckets[key] = {
                "latitude": lat_f,
                "longitude": lon_f,
                "city": city,
                "country_code": code,
                "department": department,
                "count": 0,
                "actions": Counter(),
            }
        buckets[key]["count"] += 1
        buckets[key]["actions"][log.action] += 1
        if department and not buckets[key]["department"]:
            buckets[key]["department"] = department

    by_country = []
    for code, count in countries.most_common():
        if country_geo_n[code]:
            lat = country_lat_sum[code] / country_geo_n[code]
            lon = country_lon_sum[code] / country_geo_n[code]
        else:
            lat, lon = _COUNTRY_CENTROIDS.get(code, (0.0, 0.0))
        by_country.append(
            {
                "country_code": code,
                "country": country_names.get(code) or code,
                "count": count,
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
            }
        )

    by_department = []
    for name, count in departments.most_common():
        if dept_geo_n[name]:
            lat = dept_lat_sum[name] / dept_geo_n[name]
            lon = dept_lon_sum[name] / dept_geo_n[name]
        else:
            lat, lon = _COUNTRY_CENTROIDS.get("PE", (-9.19, -75.02))
        by_department.append(
            {
                "code": _depto_code(name),
                "name": name,
                "country_code": "PE",
                "count": count,
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
            }
        )

    points = []
    for bucket in buckets.values():
        top_actions = [
            {"action": action, "count": action_count}
            for action, action_count in bucket["actions"].most_common(3)
        ]
        points.append(
            {
                "latitude": bucket["latitude"],
                "longitude": bucket["longitude"],
                "city": bucket["city"],
                "country_code": bucket["country_code"],
                "department": bucket["department"],
                "count": bucket["count"],
                "top_actions": top_actions,
            }
        )
    points.sort(key=lambda p: p["count"], reverse=True)

    timeline_rows = [
        {"date": day, "count": timeline[day]}
        for day in sorted(timeline.keys())
    ]

    return {
        "days": days,
        "points": points[:200],
        "total_events": qs.count(),
        "by_country": by_country,
        "by_department": by_department,
        "timeline": timeline_rows,
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
