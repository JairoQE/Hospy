from __future__ import annotations

import logging
import re
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

from .request_utils import client_ip

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "ipguide:lookup:"
_PRIVATE_IP_RE = re.compile(
    r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc00:|fd)"
)

COUNTRY_NAME_TO_CODE = {
    "peru": "PE",
    "perú": "PE",
    "united states": "US",
    "usa": "US",
    "argentina": "AR",
    "chile": "CL",
    "colombia": "CO",
    "mexico": "MX",
    "méxico": "MX",
    "spain": "ES",
    "españa": "ES",
    "brazil": "BR",
    "brasil": "BR",
}

DATACENTER_KEYWORDS = (
    "amazon",
    "aws",
    "google cloud",
    "microsoft azure",
    "digitalocean",
    "ovh",
    "hetzner",
    "linode",
    "vultr",
    "cloudflare",
    "hosting",
    "datacenter",
    "data center",
    "server",
    "fdcservers",
)


def _cache_timeout() -> int:
    return int(getattr(settings, "IP_GUIDE_CACHE_SECONDS", 86400))


def _api_url(ip: str) -> str:
    template = getattr(settings, "IP_GUIDE_API_TEMPLATE", "https://ip.guide/{ip}")
    api_key = getattr(settings, "IP_GUIDE_API_KEY", "") or ""
    try:
        if "{api_key}" in template:
            return template.format(ip=ip, api_key=api_key)
        return template.format(ip=ip)
    except Exception:
        return template.replace("{ip}", ip)


def _country_code(raw_country: str | None, asn_country: str | None = None) -> str:
    if asn_country and len(asn_country.strip()) == 2:
        return asn_country.strip().upper()
    if not raw_country:
        return ""
    text = raw_country.strip()
    if len(text) == 2:
        return text.upper()
    return COUNTRY_NAME_TO_CODE.get(text.lower(), text[:2].upper() if len(text) >= 2 else "")


def _looks_like_datacenter(org: str, asn_name: str) -> bool:
    blob = f"{org} {asn_name}".lower()
    return any(kw in blob for kw in DATACENTER_KEYWORDS)


def normalize_ipguide_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Estructura compacta usada en Hospy (auditoría, pagos, stats)."""
    if not raw:
        return {}

    network = raw.get("network") or {}
    hosts = network.get("hosts") or {}
    asn_block = network.get("autonomous_system") or raw.get("autonomous_system") or {}
    location = raw.get("location") or {}

    org = (asn_block.get("organization") or asn_block.get("name") or "").strip()
    asn_name = (asn_block.get("name") or "").strip()
    asn_raw = asn_block.get("asn")
    asn = int(asn_raw) if asn_raw is not None else None

    country_code = _country_code(
        location.get("country"),
        asn_block.get("country"),
    )
    city = (location.get("city") or "").strip()
    region = (location.get("region") or location.get("state") or "").strip()

    return {
        "ip": raw.get("ip") or "",
        "country_code": country_code,
        "country": location.get("country") or country_code,
        "city": city,
        "region": region,
        "timezone": location.get("timezone") or "",
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "asn": asn,
        "asn_name": asn_name,
        "organization": org,
        "rir": asn_block.get("rir") or "",
        "network_cidr": network.get("cidr") or "",
        "is_datacenter": _looks_like_datacenter(org, asn_name),
    }


def lookup_ip(ip: str | None, *, use_cache: bool = True) -> dict[str, Any]:
    """
    Consulta ip.guide y devuelve geo normalizado.
    IPs privadas/locales devuelven dict vacío sin llamar a la API.
    """
    if not ip or not str(ip).strip():
        return {}
    ip = str(ip).strip()
    if _PRIVATE_IP_RE.match(ip):
        return {"ip": ip, "country_code": "LOCAL", "city": "", "is_private": True}

    cache_key = f"{_CACHE_PREFIX}{ip}"
    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    if not getattr(settings, "IP_GUIDE_ENABLED", True):
        return {"ip": ip, "lookup_disabled": True}

    timeout = float(getattr(settings, "IP_GUIDE_TIMEOUT_SECONDS", 4.0))
    try:
        resp = requests.get(
            _api_url(ip),
            timeout=timeout,
            headers={"Accept": "application/json", "User-Agent": "Hospy/1.0"},
        )
        resp.raise_for_status()
        normalized = normalize_ipguide_payload(resp.json())
        if not normalized.get("ip"):
            normalized["ip"] = ip
    except Exception as exc:
        logger.warning("ip.guide lookup failed for %s: %s", ip, exc)
        normalized = {"ip": ip, "lookup_error": True}

    if use_cache:
        cache.set(cache_key, normalized, _cache_timeout())
    return normalized


def lookup_request(request) -> dict[str, Any]:
    return lookup_ip(client_ip(request))


def geo_hints_from_lookup(geo: dict[str, Any]) -> dict[str, Any]:
    """Sugerencias de idioma/moneda/departamento para el frontend."""
    if not geo or geo.get("is_private") or geo.get("lookup_error"):
        return {
            "detected": False,
            "language": "es-PE",
            "currency": "PEN",
            "country_code": "PE",
            "city": "",
            "message": "",
        }

    country = (geo.get("country_code") or "PE").upper()
    city = geo.get("city") or ""
    is_peru = country == "PE"

    hints = {
        "detected": True,
        "country_code": country,
        "country": geo.get("country") or country,
        "city": city,
        "timezone": geo.get("timezone") or "",
        "latitude": geo.get("latitude"),
        "longitude": geo.get("longitude"),
        "language": "es-PE" if is_peru else "en",
        "currency": "PEN" if is_peru else "USD",
        "suggested_department": city if is_peru and city else "",
        "message": (
            f"Precios en soles · ubicación aproximada: {city}, Perú"
            if is_peru and city
            else (
                f"Precios en soles · Perú"
                if is_peru
                else f"Prices in USD · approximate location: {city or country}"
            )
        ),
    }
    return hints


def city_search_fallback(geo: dict[str, Any]) -> str | None:
    """Ciudad inferida por IP para Hospix cuando el usuario no indica lugar."""
    if not geo or geo.get("is_private"):
        return None
    city = (geo.get("city") or "").strip()
    if not city:
        return None
    country = (geo.get("country_code") or "").upper()
    if country and country not in ("PE", "LOCAL"):
        return None
    return city
