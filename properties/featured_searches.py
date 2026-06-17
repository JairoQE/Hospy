"""Datos para la sección «Búsquedas destacadas» del home."""

from datetime import timedelta

from django.db.models import Avg, Count, Min, Q
from django.utils import timezone
from django.utils.text import slugify

from .media_urls import media_public_path
from .models import Accommodation, AccommodationPhoto, BrowseTile
from .services import apply_accommodation_search_params, public_accommodations_queryset
from .ubigeo_loader import resolve_departamento, resolve_provincia

CLICK_BOOST = 10
DEFAULT_LIMIT = 12


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


def build_featured_searches() -> dict:
    return {
        "ciudades": build_featured_cities(),
        "destinos": build_featured_destinations(),
    }
