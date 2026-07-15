"""Datos para la sección «Búsquedas destacadas» del home."""

from datetime import timedelta

from django.db.models import Avg, Count, Min, Q
from django.utils import timezone
from django.utils.text import slugify

from .media_urls import media_public_path
from .models import Accommodation, AccommodationPhoto, BrowseTile
from .services import (
    apply_accommodation_search_params,
    filter_accommodations_nearby,
    public_accommodations_queryset,
)
from .ubigeo_loader import resolve_departamento, resolve_provincia

CLICK_BOOST = 10
DEFAULT_LIMIT = 12
NEARBY_RADIUS_KM = 25.0


def _approved_accommodations():
    return Accommodation.objects.filter(
        is_deleted=False,
        status=Accommodation.Status.APROBADO,
        is_active=True,
    )


def _department_click_scores(since):
    scores: dict[str, int] = {}
    tiles = BrowseTile.objects.filter(
        is_active=True,
        group=BrowseTile.Group.DEPARTMENT,
    ).annotate(
        clicks_30d=Count(
            "clicks",
            filter=Q(clicks__created_at__gte=since),
        )
    )
    for tile in tiles:
        if not tile.clicks_30d:
            continue
        for key in (tile.title, tile.filter_value):
            normalized = (key or "").strip().lower()
            if normalized:
                scores[normalized] = max(scores.get(normalized, 0), tile.clicks_30d)
    return scores


def _search_params_for_city(city: str) -> dict:
    """Parámetros de búsqueda alineados con UBIGEO (evita 0 resultados en Lima, Cusco, etc.)."""
    name = (city or "").strip()
    if not name:
        return {}
    prov = resolve_provincia(name, None)
    if prov:
        params: dict = {"provincia": prov["nombre"]}
        depto = prov.get("departamento_nombre")
        if depto:
            params["departamento"] = depto
        return params
    if resolve_departamento(name):
        return {"departamento": name}
    return {"ciudad": name}


def _photos_for_cities(cities: list[str]) -> dict[str, str]:
    photos: dict[str, str] = {}
    for city in cities:
        photo = (
            AccommodationPhoto.objects.filter(
                accommodation__city__iexact=city,
                accommodation__status=Accommodation.Status.APROBADO,
                accommodation__is_active=True,
                accommodation__is_deleted=False,
            )
            .order_by("-is_primary", "order", "id")
            .first()
        )
        if photo and photo.image:
            photos[city] = media_public_path(photo.image)
    return photos


def _nearby_stats(lat: float, lng: float, radio_km: float = NEARBY_RADIUS_KM) -> dict:
    qs = public_accommodations_queryset()
    nearby = filter_accommodations_nearby(qs, lat, lng, radio_km)
    if not nearby:
        return {"hotels_count": 0, "price_from": None, "rating_avg": None}
    prices = []
    ratings = []
    for acc in nearby:
        precio = getattr(acc, "precio_desde", None)
        if precio is not None:
            prices.append(float(precio))
        rating = getattr(acc, "average_rating", None)
        if rating is not None:
            ratings.append(float(rating))
    return {
        "hotels_count": len(nearby),
        "price_from": min(prices) if prices else None,
        "rating_avg": (sum(ratings) / len(ratings)) if ratings else None,
    }


def build_featured_cities(limit: int = DEFAULT_LIMIT) -> list[dict]:
    since = timezone.now() - timedelta(days=30)
    click_scores = _department_click_scores(since)

    rows = list(
        _approved_accommodations()
        .values("city")
        .annotate(
            hotels_count=Count("id"),
            price_from=Min(
                "habitaciones__base_price",
                filter=Q(habitaciones__is_active=True),
            ),
            rating_avg=Avg("average_rating"),
        )
        .filter(hotels_count__gte=1)
    )

    for row in rows:
        city_key = (row["city"] or "").strip().lower()
        clicks = click_scores.get(city_key, 0)
        row["_score"] = row["hotels_count"] + clicks * CLICK_BOOST

    rows.sort(key=lambda r: (-r["_score"], -r["hotels_count"], r["city"]))
    rows = rows[:limit]

    images = _photos_for_cities([row["city"] for row in rows])

    return [
        {
            "kind": "city",
            "name": row["city"],
            "slug": slugify(row["city"]) or "ciudad",
            "hotels_count": row["hotels_count"],
            "price_from": float(row["price_from"]) if row["price_from"] is not None else None,
            "rating_avg": float(row["rating_avg"]) if row["rating_avg"] is not None else None,
            "image_url": images.get(row["city"]),
            "search": _search_params_for_city(row["city"]),
        }
        for row in rows
    ]


def _destination_stats(search: dict) -> dict | None:
    qs = apply_accommodation_search_params(
        public_accommodations_queryset(),
        search,
    )
    agg = qs.aggregate(
        hotels_count=Count("id", distinct=True),
        price_from=Min("precio_desde"),
        rating_avg=Avg("average_rating"),
    )
    if not agg["hotels_count"]:
        return None
    return agg


def build_featured_destinations(limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Regiones/deptos (legacy). Se mantiene por compatibilidad."""
    since = timezone.now() - timedelta(days=30)
    tiles = (
        BrowseTile.objects.filter(
            is_active=True,
            group__in=(
                BrowseTile.Group.DEPARTMENT,
                BrowseTile.Group.NATURAL_REGION,
            ),
        )
        .annotate(
            clicks_30d=Count(
                "clicks",
                filter=Q(clicks__created_at__gte=since),
            )
        )
        .order_by("-clicks_30d", "order", "title")
    )

    results: list[dict] = []
    for tile in tiles:
        if tile.group == BrowseTile.Group.NATURAL_REGION:
            search = {"zona": tile.filter_value}
        else:
            search = {"departamento": tile.filter_value}

        agg = _destination_stats(search)
        if not agg:
            continue

        results.append(
            {
                "kind": "destination",
                "name": tile.title,
                "slug": tile.slug,
                "subtitle": tile.subtitle or "",
                "hotels_count": agg["hotels_count"],
                "price_from": float(agg["price_from"])
                if agg["price_from"] is not None
                else None,
                "rating_avg": float(agg["rating_avg"])
                if agg["rating_avg"] is not None
                else None,
                "image_url": media_public_path(tile.image) if tile.image else None,
                "gradient_css": tile.gradient_css,
                "search": search,
                "tile_id": tile.id,
            }
        )
        if len(results) >= limit:
            break

    return results


def _accent_gradient(kind: str, seed: str = "") -> str:
    """Gradientes decorativos (no fotos): variedad visual sin fingir imagen del lugar."""
    palettes = {
        "event": [
            "linear-gradient(145deg, #0f766e 0%, #134e4a 45%, #f59e0b 100%)",
            "linear-gradient(145deg, #1e3a8a 0%, #312e81 50%, #06b6d4 100%)",
            "linear-gradient(145deg, #7c2d12 0%, #9a3412 40%, #fbbf24 100%)",
            "linear-gradient(145deg, #4c1d95 0%, #6d28d9 55%, #ec4899 100%)",
            "linear-gradient(145deg, #0e7490 0%, #155e75 50%, #a3e635 100%)",
        ],
        "place": [
            "linear-gradient(145deg, #14532d 0%, #166534 40%, #65a30d 100%)",
            "linear-gradient(145deg, #064e3b 0%, #0f766e 50%, #5eead4 100%)",
            "linear-gradient(145deg, #1e3a5f 0%, #0d9488 55%, #bbf7d0 100%)",
            "linear-gradient(145deg, #365314 0%, #3f6212 45%, #fde047 100%)",
            "linear-gradient(145deg, #134e4a 0%, #115e59 50%, #99f6e4 100%)",
        ],
        "restaurant": [
            "linear-gradient(145deg, #9a3412 0%, #c2410c 50%, #fbbf24 100%)",
            "linear-gradient(145deg, #7f1d1d 0%, #b91c1c 45%, #fb923c 100%)",
            "linear-gradient(145deg, #78350f 0%, #a16207 50%, #fcd34d 100%)",
            "linear-gradient(145deg, #9f1239 0%, #e11d48 50%, #fdba74 100%)",
            "linear-gradient(145deg, #7c2d12 0%, #ea580c 55%, #fef3c7 100%)",
        ],
    }
    options = palettes.get(kind) or palettes["place"]
    idx = sum(ord(ch) for ch in (seed or "x")) % len(options)
    return options[idx]


def build_featured_events(limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Eventos Actify publicados + stats de hospedajes cercanos."""
    try:
        from integrations.actify import ActifyError, list_events
    except Exception:
        return []

    try:
        payload = list_events(params={"per_page": limit})
    except ActifyError:
        return []
    except Exception:
        return []

    results: list[dict] = []
    for event in payload.get("events") or []:
        loc = event.get("location") or {}
        try:
            lat = float(loc.get("latitude"))
            lng = float(loc.get("longitude"))
        except (TypeError, ValueError):
            continue

        stats = _nearby_stats(lat, lng)
        capacity = event.get("capacity") or {}
        category = event.get("category") or {}
        name = event.get("name") or f"Evento {event.get('id')}"
        # Solo imagen real de Actify si existe; si no, visual decorativo (sin fotos inventadas).
        image_url = event.get("image_url") or None
        results.append(
            {
                "kind": "event",
                "name": name,
                "slug": f"evento-{event.get('id')}",
                "subtitle": category.get("name") or loc.get("city") or "",
                "hotels_count": stats["hotels_count"],
                "price_from": stats["price_from"],
                "rating_avg": stats["rating_avg"],
                "image_url": image_url,
                "gradient_css": _accent_gradient(
                    "event",
                    f"{name}-{category.get('slug') or ''}",
                ),
                "badge": "Actify",
                "event_id": event.get("id"),
                "start_date": event.get("start_date") or "",
                "capacity_label": (
                    "Agotado"
                    if capacity.get("is_sold_out")
                    else f"{capacity.get('available_spots') or '—'} cupos"
                ),
                "search": {
                    "lat": lat,
                    "lng": lng,
                    "radio_km": NEARBY_RADIUS_KM,
                    "event_id": event.get("id"),
                    "label": name,
                },
            }
        )
        if len(results) >= limit:
            break
    return results


def _build_places_from_conecta_tingo(limit: int) -> list[dict]:
    """Hotspots Conecta Tingo (demanda) + hospedajes cercanos."""
    try:
        from integrations.conecta_tingo import ConectaTingoError, list_hotspots
    except Exception:
        return []

    try:
        hotspots = list_hotspots(limit=limit)
    except ConectaTingoError:
        return []
    except Exception:
        return []

    results: list[dict] = []
    for spot in hotspots:
        lat = spot.get("latitude")
        lng = spot.get("longitude")
        if lat is None or lng is None:
            continue
        lat_f = float(lat)
        lng_f = float(lng)
        stats = _nearby_stats(lat_f, lng_f)
        zone = spot.get("zone") or ""
        interes = spot.get("interest_level") or 0
        entry = spot.get("entry_price") or ""
        subtitle_parts = [p for p in (zone, f"Interés {interes}/10" if interes else "") if p]
        results.append(
            {
                "kind": "place",
                "name": spot.get("name") or "Lugar",
                "slug": spot.get("slug") or "lugar",
                "subtitle": " · ".join(subtitle_parts),
                "hotels_count": stats["hotels_count"],
                "price_from": stats["price_from"],
                "rating_avg": stats["rating_avg"],
                "image_url": None,
                "gradient_css": _accent_gradient(
                    "place",
                    f"{spot.get('name') or ''}-{interes}",
                ),
                "badge": "Conecta Tingo",
                "capacity_label": entry or None,
                "search": {
                    "lat": lat_f,
                    "lng": lng_f,
                    "radio_km": NEARBY_RADIUS_KM,
                    "label": spot.get("name") or "",
                    "zona": zone,
                },
            }
        )
        if len(results) >= limit:
            break
    return results


def _build_places_from_tiles(limit: int) -> list[dict]:
    """Fallback: lugares curados en BrowseTile."""
    tiles = BrowseTile.objects.filter(
        is_active=True,
        group=BrowseTile.Group.TOURIST_PLACE,
        latitude__isnull=False,
        longitude__isnull=False,
    ).order_by("order", "title")[:limit]

    results: list[dict] = []
    for tile in tiles:
        lat = float(tile.latitude)
        lng = float(tile.longitude)
        stats = _nearby_stats(lat, lng)
        results.append(
            {
                "kind": "place",
                "name": tile.title,
                "slug": tile.slug,
                "subtitle": tile.subtitle or "",
                "hotels_count": stats["hotels_count"],
                "price_from": stats["price_from"],
                "rating_avg": stats["rating_avg"],
                "image_url": media_public_path(tile.image) if tile.image else None,
                "gradient_css": tile.gradient_css
                or "linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%)",
                "badge": "Lugar",
                "tile_id": tile.id,
                "search": {
                    "lat": lat,
                    "lng": lng,
                    "radio_km": NEARBY_RADIUS_KM,
                    "label": tile.title,
                },
            }
        )
    return results


def build_featured_places(limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Prioriza Conecta Tingo; si no hay datos, usa tiles locales."""
    from_api = _build_places_from_conecta_tingo(limit)
    if from_api:
        return from_api
    return _build_places_from_tiles(limit)


def build_featured_restaurants(limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Restaurantes RestoPoint + stats de hospedajes cercanos."""
    try:
        from integrations.restopoint import RestoPointError, list_restaurants
    except Exception:
        return []

    try:
        payload = list_restaurants(page=0, size=max(limit, 20))
    except RestoPointError:
        return []
    except Exception:
        return []

    results: list[dict] = []
    for row in payload.get("restaurants") or []:
        try:
            lat = float(row.get("latitude"))
            lng = float(row.get("longitude"))
        except (TypeError, ValueError):
            continue

        stats = _nearby_stats(lat, lng)
        city = row.get("city") or ""
        district = row.get("district") or ""
        subtitle = " · ".join(p for p in (district, city) if p)
        rating = row.get("avg_rating")
        capacity = row.get("total_capacity")
        results.append(
            {
                "kind": "restaurant",
                "name": row.get("name") or f"Restaurante {row.get('id')}",
                "slug": f"resto-{row.get('id')}",
                "subtitle": subtitle,
                "hotels_count": stats["hotels_count"],
                "price_from": stats["price_from"],
                "rating_avg": float(rating) if rating is not None else stats["rating_avg"],
                "image_url": row.get("image_url") or row.get("cover_image_url") or None,
                "gradient_css": _accent_gradient(
                    "restaurant",
                    str(row.get("name") or row.get("id") or ""),
                ),
                "badge": "RestoPoint",
                "restaurant_id": row.get("id"),
                "capacity_label": (
                    f"{capacity} mesas" if capacity is not None else None
                ),
                "search": {
                    "lat": lat,
                    "lng": lng,
                    "radio_km": NEARBY_RADIUS_KM,
                    "restaurant_id": row.get("id"),
                    "label": row.get("name") or "",
                },
            }
        )
        if len(results) >= limit:
            break
    return results


def build_featured_searches() -> dict:
    return {
        "ciudades": build_featured_cities(),
        "eventos": build_featured_events(),
        "lugares": build_featured_places(),
        "restaurantes": build_featured_restaurants(),
        # Compat: antiguas regiones/deptos (ya no se usan en la UI principal)
        "destinos": build_featured_destinations(),
    }
