from collections import defaultdict

from django.db.models import Avg

from properties.models import Accommodation

from .categories import DISTRIBUTION_BUCKETS, REVIEW_CATEGORY_KEYS
from .models import Review


def _to_ten_scale(avg_five: float) -> float:
    return round(avg_five * 2, 1)


def build_accommodation_review_insights(accommodation) -> dict:
    """Agrega puntuaciones por categoría y distribución de opiniones."""
    reviews = list(
        Review.objects.filter(
            accommodation_id=accommodation.pk,
            status=Review.Status.APROBADA,
        ).only("rating", "category_ratings")
    )
    total = len(reviews)
    if total == 0:
        return {
            "total": 0,
            "average_ten": None,
            "above_average_in_city": False,
            "destacadas": [],
            "otras": [],
            "distribution": [
                {"key": key, "count": 0, "percent": 0}
                for key, _ in DISTRIBUTION_BUCKETS
            ],
        }

    rating_sum = sum(r.rating for r in reviews)
    average_ten = _to_ten_scale(rating_sum / total)

    category_values: dict[str, list[int]] = defaultdict(list)
    distribution_counts = {key: 0 for key, _ in DISTRIBUTION_BUCKETS}
    rating_to_bucket = {stars: key for key, stars in DISTRIBUTION_BUCKETS}

    for review in reviews:
        bucket = rating_to_bucket.get(review.rating)
        if bucket:
            distribution_counts[bucket] += 1
        for cat_key, value in (review.category_ratings or {}).items():
            if cat_key in REVIEW_CATEGORY_KEYS and value:
                category_values[cat_key].append(int(value))

    category_scores: list[dict] = []
    for key in REVIEW_CATEGORY_KEYS:
        values = category_values.get(key)
        if not values:
            continue
        category_scores.append(
            {"key": key, "score": _to_ten_scale(sum(values) / len(values))}
        )

    destacadas = sorted(
        [c for c in category_scores if c["score"] >= 8.0],
        key=lambda x: x["score"],
        reverse=True,
    )
    otras = sorted(
        [c for c in category_scores if c["score"] < 8.0],
        key=lambda x: x["score"],
        reverse=True,
    )

    distribution = []
    for key, _stars in DISTRIBUTION_BUCKETS:
        count = distribution_counts[key]
        distribution.append(
            {
                "key": key,
                "count": count,
                "percent": round(count * 100 / total),
            }
        )

    city_avg = (
        Review.objects.filter(
            accommodation__city=accommodation.city,
            accommodation__status=Accommodation.Status.APROBADO,
            status=Review.Status.APROBADA,
        ).aggregate(avg=Avg("rating"))["avg"]
    )
    above_average = False
    if city_avg is not None:
        above_average = (rating_sum / total) > float(city_avg)

    return {
        "total": total,
        "average_ten": average_ten,
        "above_average_in_city": above_average,
        "city": accommodation.city,
        "destacadas": destacadas,
        "otras": otras,
        "distribution": distribution,
    }
