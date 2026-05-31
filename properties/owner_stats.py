from decimal import Decimal

from django.db.models import Avg, Count

from properties.services import public_accommodations_queryset


def get_owner_public_stats(owner_id: int) -> dict:
    """Promedio de reseñas aprobadas en todos los locales públicos del propietario."""
    from reviews.models import Review

    acc_qs = public_accommodations_queryset().filter(owner_id=owner_id)
    accommodations_count = acc_qs.count()
    acc_ids = list(acc_qs.values_list("id", flat=True))

    if not acc_ids:
        return {
            "average_rating": 0.0,
            "reviews_count": 0,
            "accommodations_count": 0,
        }

    agg = Review.objects.filter(
        accommodation_id__in=acc_ids,
        status=Review.Status.APROBADA,
    ).aggregate(avg=Avg("rating"), cnt=Count("id"))

    avg = agg["avg"]
    return {
        "average_rating": round(float(avg), 1) if avg is not None else 0.0,
        "reviews_count": int(agg["cnt"] or 0),
        "accommodations_count": accommodations_count,
    }


def owner_public_accommodations(owner_id: int):
    return (
        public_accommodations_queryset()
        .filter(owner_id=owner_id)
        .prefetch_related("services", "fotos", "habitaciones")
        .order_by("-average_rating", "name")
    )


def owner_recent_reviews(owner_id: int, limit: int = 6):
    from reviews.models import Review

    acc_ids = list(
        public_accommodations_queryset()
        .filter(owner_id=owner_id)
        .values_list("id", flat=True)
    )
    if not acc_ids:
        return Review.objects.none()
    return (
        Review.objects.filter(
            accommodation_id__in=acc_ids,
            status=Review.Status.APROBADA,
        )
        .select_related("author", "accommodation", "booking", "booking__room")
        .order_by("-created_at")[:limit]
    )
