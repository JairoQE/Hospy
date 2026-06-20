"""Categorías de puntuación detallada en reseñas (escala 1–5 por categoría)."""

REVIEW_CATEGORY_KEYS = (
    "limpieza",
    "ubicacion",
    "servicio",
    "relacion_calidad_precio",
    "instalaciones",
    "comodidad_habitacion",
    "descanso",
    "wifi",
    "desayuno",
)

DISTRIBUTION_BUCKETS = (
    ("excelente", 5),
    ("muy_bueno", 4),
    ("bueno", 3),
    ("razonable", 2),
    ("malo", 1),
)


def normalize_category_ratings(raw: dict | None) -> dict[str, int]:
    if not raw or not isinstance(raw, dict):
        return {}
    cleaned: dict[str, int] = {}
    for key in REVIEW_CATEGORY_KEYS:
        if key not in raw:
            continue
        try:
            value = int(raw[key])
        except (TypeError, ValueError):
            continue
        if 1 <= value <= 5:
            cleaned[key] = value
    return cleaned
