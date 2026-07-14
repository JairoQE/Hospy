"""Cliente Factiliza: consulta DNI (RENIEC) para verificación de identidad."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.cache import cache

from .payout import validate_dni

logger = logging.getLogger(__name__)

CACHE_TTL = 60 * 15  # 15 min — evita gastar créditos al confirmar


class FactilizaError(Exception):
    """Error al consultar Factiliza / DNI."""

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class DniLookupResult:
    numero: str
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    nombre_completo: str

    def as_public_dict(self) -> dict[str, str]:
        """Datos seguros para el frontend (sin dirección ni ubigeo)."""
        return {
            "numero": self.numero,
            "nombres": self.nombres,
            "apellido_paterno": self.apellido_paterno,
            "apellido_materno": self.apellido_materno,
            "nombre_completo": self.nombre_completo,
        }


def _mock_lookup(dni: str) -> DniLookupResult:
    return DniLookupResult(
        numero=dni,
        nombres="USUARIO",
        apellido_paterno="DEMO",
        apellido_materno="HOSPY",
        nombre_completo=f"DEMO HOSPY, USUARIO ({dni})",
    )


def _parse_payload(data: dict, dni: str) -> DniLookupResult:
    payload = data.get("data") if isinstance(data.get("data"), dict) else data
    nombres = (payload.get("nombres") or "").strip()
    ap_pat = (payload.get("apellido_paterno") or "").strip()
    ap_mat = (payload.get("apellido_materno") or "").strip()
    completo = (payload.get("nombre_completo") or "").strip()
    if not completo and (nombres or ap_pat or ap_mat):
        completo = f"{ap_pat} {ap_mat}, {nombres}".strip(" ,")
    if not nombres and not ap_pat:
        raise FactilizaError("No se encontraron datos para este DNI.", status_code=404)
    return DniLookupResult(
        numero=str(payload.get("numero") or dni),
        nombres=nombres,
        apellido_paterno=ap_pat,
        apellido_materno=ap_mat,
        nombre_completo=completo,
    )


def lookup_dni(dni: str, *, user_id: int | None = None) -> DniLookupResult:
    """
    Consulta DNI en Factiliza (o mock en desarrollo).
    Cachea el resultado para no consumir 2 créditos al confirmar.
    """
    normalized = validate_dni(dni)
    cache_key = f"factiliza:dni:{user_id or 0}:{normalized}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return DniLookupResult(**cached)

    use_mock = bool(getattr(settings, "FACTILIZA_MOCK", False))
    token = (getattr(settings, "FACTILIZA_API_TOKEN", "") or "").strip()

    if use_mock or not token:
        if not use_mock and not token:
            raise FactilizaError(
                "La verificación de identidad no está configurada (FACTILIZA_API_TOKEN).",
                status_code=503,
            )
        result = _mock_lookup(normalized)
        cache.set(cache_key, result.__dict__, CACHE_TTL)
        return result

    base = getattr(settings, "FACTILIZA_BASE_URL", "https://api.factiliza.com/v1").rstrip(
        "/"
    )
    url = f"{base}/dni/info/{normalized}"
    try:
        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=12,
        )
    except requests.RequestException as exc:
        logger.warning("Factiliza request failed: %s", exc)
        raise FactilizaError(
            "No se pudo contactar el servicio de verificación. Intenta de nuevo.",
            status_code=502,
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise FactilizaError(
            "Respuesta inválida del servicio de verificación.",
            status_code=502,
        ) from exc

    if response.status_code >= 400 or body.get("success") is False:
        msg = (
            body.get("message")
            or "No se pudo verificar el DNI. Revisa el número e inténtalo de nuevo."
        )
        raise FactilizaError(str(msg), status_code=response.status_code)

    result = _parse_payload(body, normalized)
    cache.set(cache_key, result.__dict__, CACHE_TTL)
    return result
