import hashlib
import json
import math
from datetime import date
from functools import reduce
from operator import or_

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Min, Prefetch, Q
from django.utils import timezone


def public_accommodations_queryset(on_date: date | None = None):
    from .models import Accommodation, AccommodationOffer
    from reviews.models import Review

    on_date = on_date or timezone.localdate()
    active_offers = AccommodationOffer.objects.filter(
        is_active=True,
        start_date__lte=on_date,
        end_date__gte=on_date,
    ).prefetch_related("rooms")

    from rooms.models import Room

    active_rooms = Prefetch(
        "habitaciones",
        queryset=Room.objects.filter(is_active=True).only("id", "base_price"),
    )

    return (
        Accommodation.objects.filter(
            is_deleted=False,
            status=Accommodation.Status.APROBADO,
            is_active=True,
        )
        .annotate(
            precio_desde=Min(
                "habitaciones__base_price",
                filter=Q(habitaciones__is_active=True),
            ),
            reviews_count=Count(
                "resenas",
                filter=Q(resenas__status=Review.Status.APROBADA),
            ),
        )
        .select_related("owner")
        .prefetch_related(
            "fotos",
            "services",
            "faqs",
            Prefetch("ofertas", queryset=active_offers, to_attr="active_offers_list"),
            active_rooms,
        )
    )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en km entre dos puntos GPS."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return r * 2 * math.asin(math.sqrt(a))


def filter_accommodations_nearby(qs, lat: float, lng: float, radio_km: float):
    """RF-19: hospedajes dentro del radio, ordenados por distancia."""
    results = []
    for acc in qs:
        dist = haversine_km(
            float(acc.latitude),
            float(acc.longitude),
            lat,
            lng,
        )
        if dist <= radio_km:
            acc.distance_km = round(dist, 2)
            results.append(acc)
    return sorted(results, key=lambda a: a.distance_km)


def integration_cache_key(prefix: str, params: dict) -> str:
    raw = json.dumps(params, sort_keys=True, default=str)
    digest = hashlib.md5(raw.encode()).hexdigest()
    return f"hospy:integracion:{prefix}:{digest}"


def cache_integration_response(prefix: str, params: dict, builder):
    """Caché Redis 5 min para API SIST."""
    key = integration_cache_key(prefix, params)
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = builder()
    cache.set(key, data, settings.INTEGRATION_CACHE_TIMEOUT)
    return data


def invalidate_accommodation_cache(accommodation_id: int | None = None) -> None:
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("hospy:integracion:*")
        elif accommodation_id:
            cache.delete(f"hospy:acc:{accommodation_id}")
            cache.delete(f"hospy:detalle_bootstrap:{accommodation_id}")
            cache.delete("hospy:admin_dashboard")
    except Exception:
        pass


def filter_accommodations_by_availability(qs, check_in, check_out):
    """RF-31: hospedajes con al menos una habitación libre en el rango."""
    from datetime import date

    from bookings.services import is_room_available

    if isinstance(check_in, str):
        check_in = date.fromisoformat(check_in)
    if isinstance(check_out, str):
        check_out = date.fromisoformat(check_out)
    if check_out <= check_in:
        return qs.none()

    available_ids = []
    for acc in qs.prefetch_related("habitaciones"):
        for room in acc.habitaciones.filter(is_active=True):
            ok, _ = is_room_available(room, check_in, check_out)
            if ok:
                available_ids.append(acc.id)
                break
    return qs.filter(id__in=available_ids)


def apply_accommodation_search_params(queryset, params):
    """Filtros de búsqueda HU-02: ciudad, fechas, tipo, precio, servicios, orden."""
    from django.db.models import Q

    from .geography import (
        district_name_variants,
        expand_free_text_location_to_cities,
        get_departamento_cities,
        get_distrito_search_names,
        get_provincia_cities,
        get_zona_cities,
    )

    ciudad_raw = params.get("ciudad") or params.get("city")
    ciudad = (
        str(ciudad_raw).strip()
        if ciudad_raw is not None and str(ciudad_raw).strip()
        else None
    )
    distrito = params.get("distrito")
    departamento = params.get("departamento")
    provincia = params.get("provincia")
    zona = params.get("zona")

    if ciudad:
        expanded = expand_free_text_location_to_cities(ciudad)
        if expanded:
            queryset = queryset.filter(
                reduce(
                    or_,
                    (
                        Q(city__iexact=n)
                        | Q(city__icontains=n)
                        | Q(address__icontains=n)
                        for n in expanded
                    ),
                )
            )
        else:
            variants = [v for v in district_name_variants([ciudad]) if v]
            if variants:
                queryset = queryset.filter(
                    reduce(
                        or_,
                        (
                            Q(city__iexact=v)
                            | Q(city__icontains=v)
                            | Q(address__icontains=v)
                            for v in variants
                        ),
                    )
                )
    elif distrito:
        names = get_distrito_search_names(distrito)
        if not names:
            queryset = queryset.none()
        else:
            distrito_name = names[0]
            queryset = queryset.filter(
                Q(city__iexact=distrito_name)
                | Q(city__icontains=distrito_name)
                | Q(address__icontains=distrito_name)
            )
        if departamento:
            dept_cities = get_departamento_cities(departamento)
            if dept_cities:
                queryset = queryset.filter(
                    city__in=district_name_variants(dept_cities)
                )
        if provincia:
            prov_cities = get_provincia_cities(provincia, departamento)
            if prov_cities:
                queryset = queryset.filter(
                    city__in=district_name_variants(prov_cities)
                )
    elif provincia and not zona:
        cities = get_provincia_cities(provincia, departamento)
        if cities:
            cities_v = district_name_variants(cities)
            queryset = queryset.filter(
                Q(city__in=cities_v) | Q(region__iexact=provincia)
            )
        else:
            queryset = queryset.filter(
                Q(region__iexact=provincia) | Q(city__iexact=provincia)
            )
    elif departamento and not zona:
        cities = get_departamento_cities(departamento)
        if cities:
            queryset = queryset.filter(city__in=district_name_variants(cities))
        else:
            queryset = queryset.none()
    elif zona:
        cities = get_zona_cities(zona, departamento)
        if cities:
            queryset = queryset.filter(city__in=district_name_variants(cities))
        elif departamento:
            queryset = queryset.none()
        else:
            fallback = get_zona_cities(zona)
            if fallback:
                queryset = queryset.filter(
                    city__in=district_name_variants(fallback)
                )
            else:
                queryset = queryset.none()

    tipo = params.get("tipo") or params.get("type")
    if tipo:
        queryset = queryset.filter(type=tipo)

    entrada = params.get("entrada")
    salida = params.get("salida")
    if entrada and salida:
        queryset = filter_accommodations_by_availability(queryset, entrada, salida)
    elif entrada or salida:
        return queryset.none()

    precio_min = params.get("precio_min")
    if precio_min is not None:
        queryset = queryset.filter(precio_desde__gte=precio_min)

    precio_max = params.get("precio_max")
    if precio_max is not None:
        queryset = queryset.filter(precio_desde__lte=precio_max)

    ofertas = params.get("ofertas") or params.get("oferta")
    if ofertas and str(ofertas).lower() in ("1", "true", "si", "yes"):
        from .offer_services import accommodation_ids_with_active_offers

        offer_ids = accommodation_ids_with_active_offers()
        if not offer_ids:
            return queryset.none()
        queryset = queryset.filter(id__in=offer_ids)

    servicios = params.getlist("servicios") if hasattr(params, "getlist") else []
    if not servicios and params.get("servicios"):
        servicios = [s.strip() for s in params.get("servicios").split(",") if s.strip()]
    for slug in servicios:
        queryset = queryset.filter(services__slug=slug)

    ordenar = params.get("ordenar", "-created_at")
    allowed = {
        "precio": "precio_desde",
        "-precio": "-precio_desde",
        "rating": "average_rating",
        "-rating": "-average_rating",
        "nombre": "name",
        "-nombre": "-name",
        "fecha": "created_at",
        "-fecha": "-created_at",
    }
    order = allowed.get(ordenar, "-created_at")
    return queryset.order_by(order)


def _notify_owner_approval_sync(
    accommodation_id: int, approved: bool, motivo: str = ""
) -> None:
    from config.mail import queue_email

    from .models import Accommodation

    accommodation = Accommodation.objects.select_related("owner").get(
        pk=accommodation_id
    )
    subject = (
        f"Hospy: tu hospedaje «{accommodation.name}» fue aprobado"
        if approved
        else f"Hospy: tu hospedaje «{accommodation.name}» fue rechazado"
    )
    if approved:
        body = (
            f"Hola {accommodation.owner.first_name},\n\n"
            f"Tu establecimiento «{accommodation.name}» ya está visible en Hospy.\n\n"
            "— Equipo Hospy"
        )
    else:
        body = (
            f"Hola {accommodation.owner.first_name},\n\n"
            f"Tu registro «{accommodation.name}» no fue aprobado.\n"
            f"Motivo: {motivo}\n\n"
            "Puedes corregir la información y volver a enviarlo.\n\n"
            "— Equipo Hospy"
        )
    queue_email(subject, body, accommodation.owner.email)
    from notifications.services import notify_accommodation_moderated

    notify_accommodation_moderated(accommodation, approved, motivo)


def notify_owner_approval(accommodation, approved: bool, motivo: str = "") -> None:
    from .tasks import notify_owner_approval_task

    notify_owner_approval_task.delay(accommodation.pk, approved, motivo)
