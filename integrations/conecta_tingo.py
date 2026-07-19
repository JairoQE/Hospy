"""Cliente Conecta Tingo: demanda turística, hotspots y perfiles (API Key)."""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils.text import slugify

from integrations.partner_frontends import conecta_tingo_place_url

logger = logging.getLogger(__name__)

CACHE_TTL = 120  # 2 min — rate limit 60/min; datos de demanda cambiantes
CACHE_KEY = "conecta_tingo:datos:v3"

# Centro urbano (fallback por zona cuando el POI no tiene coordenada propia).
_ZONE_COORDS: dict[str, tuple[float, float]] = {
    "tingo maria": (-9.295600, -75.997800),
}

# IDs públicos del frontend Conecta Tingo (/lugares/{id}).
_POI_PUBLIC_IDS: dict[str, int] = {
    "cueva las lechuzas": 1,
    "cueva de las lechuzas": 1,
    "cueva de las pavas": 2,
    "la roca flotante": 3,
    "laguna de los milagros": 4,
    "catarata del rio derrepente": 5,
    "catarata de velo de la novia": 8,
    "museo de tingo maria": 9,
    "catarata santa carmen": 10,
    "balneario la alcantarilla": 11,
    "velo de las ninfas": 16,
}

# Coordenadas aproximadas de atractivos conocidos (la API no envía lat/lng).
_POI_COORDS: dict[str, tuple[float, float]] = {
    "la roca flotante": (-9.304500, -75.995200),
    "laguna de los milagros": (-9.150800, -75.998600),
    "cueva las lechuzas": (-9.316700, -76.016700),
    "cueva de las lechuzas": (-9.316700, -76.016700),
    "cueva de las pavas": (-9.298200, -76.008400),
    "catarata del rio derrepente": (-9.268400, -75.986100),
    "catarata del río derrepente": (-9.268400, -75.986100),
    "catarata de velo de la novia": (-9.322100, -75.978900),
    "velo de las ninfas": (-9.319800, -75.977200),
    "museo de tingo maria": (-9.297800, -75.998100),
    "museo de tingo maría": (-9.297800, -75.998100),
    "catarata santa carmen": (-9.279500, -75.991400),
    "balneario la alcantarilla": (-9.286200, -76.012500),
}


class ConectaTingoError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _configured() -> bool:
    return bool((getattr(settings, "CONECTA_TINGO_API_KEY", "") or "").strip())


def _base_url() -> str:
    return getattr(
        settings,
        "CONECTA_TINGO_BASE_URL",
        "https://conectatingo.com/api/integracion",
    ).rstrip("/")


def _norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").strip().lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text)


def resolve_coords(destino: str, zona: str = "") -> tuple[float, float] | None:
    """Resuelve lat/lng del POI o, en su defecto, del centro de zona."""
    poi = _POI_COORDS.get(_norm(destino))
    if poi:
        return poi
    zone = _ZONE_COORDS.get(_norm(zona))
    if zone:
        return zone
    return None


def _request_datos() -> dict[str, Any]:
    if not _configured():
        raise ConectaTingoError(
            "Conecta Tingo no está configurado (CONECTA_TINGO_API_KEY).",
            status_code=503,
        )
    url = f"{_base_url()}/datos"
    key = (getattr(settings, "CONECTA_TINGO_API_KEY", "") or "").strip()
    try:
        response = requests.get(
            url,
            params={"api_key": key},
            headers={"Accept": "application/json"},
            timeout=float(getattr(settings, "CONECTA_TINGO_TIMEOUT_SECONDS", 12)),
        )
    except requests.RequestException as exc:
        logger.warning("Conecta Tingo network error: %s", exc)
        raise ConectaTingoError(
            "No se pudo contactar Conecta Tingo.",
            status_code=502,
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise ConectaTingoError(
            "Respuesta inválida de Conecta Tingo.",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        msg = "Error al consultar Conecta Tingo."
        if isinstance(body, dict):
            msg = str(body.get("message") or body.get("detail") or msg)
        raise ConectaTingoError(msg, status_code=response.status_code)

    if not isinstance(body, dict):
        raise ConectaTingoError(
            "Respuesta inválida de Conecta Tingo.",
            status_code=502,
        )
    return body


def fetch_datos(*, force_refresh: bool = False) -> dict[str, Any]:
    """GET /datos con caché (status, timestamp, version, data)."""
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if isinstance(cached, dict):
            return cached
    body = _request_datos()
    cache.set(CACHE_KEY, body, CACHE_TTL)
    return body


def _entry_prices(data: dict[str, Any]) -> dict[str, str]:
    prices: dict[str, str] = {}
    eventos = (data.get("eventos") or {}) if isinstance(data, dict) else {}
    for row in eventos.get("metricas") or []:
        if not isinstance(row, dict):
            continue
        lugar = _norm(str(row.get("lugar") or ""))
        precio = str(row.get("precio_entrada") or "").strip()
        if lugar and precio:
            prices[lugar] = precio
    return prices


def _entry_photos(data: dict[str, Any]) -> dict[str, str]:
    photos: dict[str, str] = {}
    eventos = (data.get("eventos") or {}) if isinstance(data, dict) else {}
    for row in eventos.get("metricas") or []:
        if not isinstance(row, dict):
            continue
        lugar = _norm(str(row.get("lugar") or ""))
        foto = str(
            row.get("foto") or row.get("image") or row.get("image_url") or ""
        ).strip()
        if lugar and foto:
            photos[lugar] = foto
    return photos


def list_hotspots(limit: int | None = None) -> list[dict[str, Any]]:
    """
    Normaliza hotspots de demanda hotelera (data.hoteles.metricas).

    Incluye coords, precio de entrada e imagen (`foto`) cuando existen.
    """
    payload = fetch_datos()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    hoteles = data.get("hoteles") if isinstance(data.get("hoteles"), dict) else {}
    metricas = hoteles.get("metricas") or []
    prices = _entry_prices(data)
    photos = _entry_photos(data)

    results: list[dict[str, Any]] = []
    for row in metricas:
        if not isinstance(row, dict):
            continue
        destino = str(row.get("destino") or "").strip()
        if not destino:
            continue
        zona = str(row.get("zona") or "").strip()
        try:
            interes = int(str(row.get("nivel_interes") or "0").strip())
        except ValueError:
            interes = 0
        coords = resolve_coords(destino, zona)
        foto = str(
            row.get("foto")
            or row.get("image")
            or row.get("image_url")
            or photos.get(_norm(destino))
            or ""
        ).strip()
        public_id = _POI_PUBLIC_IDS.get(_norm(destino))
        results.append(
            {
                "name": destino,
                "slug": slugify(destino) or "lugar",
                "public_id": public_id,
                "zone": zona,
                "interest_level": interes,
                "entry_price": prices.get(_norm(destino)) or "",
                "image_url": foto or None,
                "latitude": coords[0] if coords else None,
                "longitude": coords[1] if coords else None,
                "external_url": conecta_tingo_place_url(public_id),
                "source": "conecta_tingo",
            }
        )

    results.sort(key=lambda item: (-item["interest_level"], item["name"]))
    if limit is not None:
        results = results[: max(0, int(limit))]
    return results


def get_hotspot(slug: str) -> dict[str, Any]:
    """Detalle de un hotspot por slug."""
    wanted = (slug or "").strip().lower()
    if not wanted:
        raise ConectaTingoError("Slug de lugar requerido.", status_code=400)
    for spot in list_hotspots():
        if str(spot.get("slug") or "").lower() == wanted:
            return spot
    raise ConectaTingoError("Lugar turístico no encontrado.", status_code=404)


def catalog_payload() -> dict[str, Any]:
    """Payload público para el proxy Hospy."""
    raw = fetch_datos()
    hotspots = list_hotspots()
    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    return {
        "provider": "conecta_tingo",
        "status": raw.get("status"),
        "timestamp": raw.get("timestamp"),
        "version": raw.get("version"),
        "hotspots": hotspots,
        "profiles": {
            "tourist_types": (data.get("restaurantes") or {}).get("metricas") or [],
            "mobility": (data.get("movilidad") or {}).get("metricas") or [],
            "entry_prices": (data.get("eventos") or {}).get("metricas") or [],
        },
        "raw_sections": {
            key: {
                "descripcion": (section or {}).get("descripcion"),
                "count": len((section or {}).get("metricas") or []),
            }
            for key, section in data.items()
            if isinstance(section, dict)
        },
    }
