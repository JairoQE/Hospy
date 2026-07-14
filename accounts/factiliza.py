"""Consulta DNI (RENIEC) y RUC (SUNAT) con proveedores redundantes: Factiliza → ApiInti."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.cache import cache

from .payout import validate_dni, validate_ruc

logger = logging.getLogger(__name__)

CACHE_TTL = 60 * 15  # 15 min — evita gastar créditos al confirmar


class FactilizaError(Exception):
    """Error al consultar proveedores de DNI / RENIEC / RUC."""

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


IdentityLookupError = FactilizaError


@dataclass(frozen=True)
class DniLookupResult:
    numero: str
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    nombre_completo: str
    provider: str = ""

    def as_public_dict(self) -> dict[str, str]:
        """Datos seguros para el frontend (sin dirección ni ubigeo)."""
        return {
            "numero": self.numero,
            "nombres": self.nombres,
            "apellido_paterno": self.apellido_paterno,
            "apellido_materno": self.apellido_materno,
            "nombre_completo": self.nombre_completo,
        }


@dataclass(frozen=True)
class RucLookupResult:
    ruc: str
    legal_name: str
    estado: str = ""
    condicion: str = ""
    provider: str = ""

    def as_public_dict(self) -> dict[str, str]:
        return {
            "ruc": self.ruc,
            "legal_name": self.legal_name,
            "estado": self.estado,
            "condicion": self.condicion,
        }

    def is_operable(self) -> bool:
        """True si SUNAT reporta empresa usable (activo / habido cuando aplica)."""
        estado = (self.estado or "").strip().upper()
        condicion = (self.condicion or "").strip().upper()
        if estado and estado not in ("ACTIVO", "ACTIVA"):
            return False
        if condicion and "HABIDO" not in condicion and condicion not in ("", "HABIDO"):
            # HABIDO / HABIDO NO HALLADO variants — solo bloqueamos NO HABIDO claros
            if "NO HABIDO" in condicion or condicion == "NO_HABIDO":
                return False
        return bool(self.legal_name)


def _mock_lookup(dni: str) -> DniLookupResult:
    return DniLookupResult(
        numero=dni,
        nombres="USUARIO",
        apellido_paterno="DEMO",
        apellido_materno="HOSPY",
        nombre_completo=f"DEMO HOSPY, USUARIO ({dni})",
        provider="mock",
    )


def _mock_lookup_ruc(ruc: str) -> RucLookupResult:
    return RucLookupResult(
        ruc=ruc,
        legal_name=f"EMPRESA DEMO HOSPY S.A.C. ({ruc})",
        estado="ACTIVO",
        condicion="HABIDO",
        provider="mock",
    )


def _build_result(
    *,
    dni: str,
    nombres: str,
    ap_pat: str,
    ap_mat: str,
    completo: str = "",
    numero: str = "",
    provider: str,
) -> DniLookupResult:
    nombres = (nombres or "").strip()
    ap_pat = (ap_pat or "").strip()
    ap_mat = (ap_mat or "").strip()
    completo = (completo or "").strip()
    if not completo and (nombres or ap_pat or ap_mat):
        completo = f"{ap_pat} {ap_mat}, {nombres}".strip(" ,")
    if not nombres and not ap_pat:
        raise FactilizaError("No se encontraron datos para este DNI.", status_code=404)
    return DniLookupResult(
        numero=str(numero or dni),
        nombres=nombres,
        apellido_paterno=ap_pat,
        apellido_materno=ap_mat,
        nombre_completo=completo,
        provider=provider,
    )


def _parse_factiliza(body: dict, dni: str) -> DniLookupResult:
    payload = body.get("data") if isinstance(body.get("data"), dict) else body
    return _build_result(
        dni=dni,
        nombres=payload.get("nombres") or "",
        ap_pat=payload.get("apellido_paterno") or "",
        ap_mat=payload.get("apellido_materno") or "",
        completo=payload.get("nombre_completo") or "",
        numero=payload.get("numero") or dni,
        provider="factiliza",
    )


def _parse_apiinti(body: dict, dni: str) -> DniLookupResult:
    payload = body.get("data") if isinstance(body.get("data"), dict) else body
    return _build_result(
        dni=dni,
        nombres=payload.get("nombres") or "",
        ap_pat=payload.get("apellidoPaterno")
        or payload.get("apellido_paterno")
        or "",
        ap_mat=payload.get("apellidoMaterno")
        or payload.get("apellido_materno")
        or "",
        completo=payload.get("nombre_completo")
        or payload.get("nombreCompleto")
        or "",
        numero=payload.get("dni") or payload.get("numero") or dni,
        provider="apiinti",
    )


def _request_json(url: str, token: str) -> tuple[int, dict]:
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        timeout=12,
    )
    try:
        body = response.json()
    except ValueError as exc:
        raise FactilizaError(
            "Respuesta inválida del servicio de verificación.",
            status_code=502,
        ) from exc
    if not isinstance(body, dict):
        raise FactilizaError(
            "Respuesta inválida del servicio de verificación.",
            status_code=502,
        )
    return response.status_code, body


def _lookup_factiliza(dni: str) -> DniLookupResult:
    token = (getattr(settings, "FACTILIZA_API_TOKEN", "") or "").strip()
    if not token:
        raise FactilizaError("Factiliza no configurado.", status_code=503)
    base = getattr(settings, "FACTILIZA_BASE_URL", "https://api.factiliza.com/v1").rstrip(
        "/"
    )
    status_code, body = _request_json(f"{base}/dni/info/{dni}", token)
    if status_code >= 400 or body.get("success") is False:
        msg = (
            body.get("message")
            or "No se pudo verificar el DNI. Revisa el número e inténtalo de nuevo."
        )
        raise FactilizaError(str(msg), status_code=status_code)
    return _parse_factiliza(body, dni)


def _lookup_apiinti(dni: str) -> DniLookupResult:
    token = (getattr(settings, "APIINTI_API_TOKEN", "") or "").strip()
    if not token:
        raise FactilizaError("ApiInti no configurado.", status_code=503)
    base = getattr(settings, "APIINTI_BASE_URL", "https://app.apiinti.dev/api/v1").rstrip(
        "/"
    )
    status_code, body = _request_json(f"{base}/dni/{dni}", token)
    if status_code >= 400 or body.get("success") is False:
        msg = (
            body.get("message")
            or body.get("error")
            or "No se pudo verificar el DNI. Revisa el número e inténtalo de nuevo."
        )
        raise FactilizaError(str(msg), status_code=status_code)
    return _parse_apiinti(body, dni)


def lookup_dni(dni: str, *, user_id: int | None = None) -> DniLookupResult:
    """
    Consulta DNI con redundancia: Factiliza → ApiInti (o mock en desarrollo).
    Cachea el resultado para no consumir 2 créditos al confirmar.
    """
    normalized = validate_dni(dni)
    cache_key = f"reniec:dni:{user_id or 0}:{normalized}"
    # Compat: caché previa de Factiliza
    cached = cache.get(cache_key) or cache.get(f"factiliza:dni:{user_id or 0}:{normalized}")
    if isinstance(cached, dict):
        # provider puede faltar en cachés antiguas
        cached.setdefault("provider", "")
        return DniLookupResult(**{k: cached[k] for k in (
            "numero",
            "nombres",
            "apellido_paterno",
            "apellido_materno",
            "nombre_completo",
            "provider",
        )})

    use_mock = bool(getattr(settings, "FACTILIZA_MOCK", False))
    factiliza_token = (getattr(settings, "FACTILIZA_API_TOKEN", "") or "").strip()
    apiinti_token = (getattr(settings, "APIINTI_API_TOKEN", "") or "").strip()

    if use_mock or (not factiliza_token and not apiinti_token):
        if not use_mock and not factiliza_token and not apiinti_token:
            raise FactilizaError(
                "La verificación de identidad no está configurada "
                "(FACTILIZA_API_TOKEN / APIINTI_API_TOKEN).",
                status_code=503,
            )
        result = _mock_lookup(normalized)
        cache.set(cache_key, result.__dict__, CACHE_TTL)
        return result

    providers = []
    if factiliza_token:
        providers.append(("factiliza", _lookup_factiliza))
    if apiinti_token:
        providers.append(("apiinti", _lookup_apiinti))

    errors: list[str] = []
    for name, fn in providers:
        try:
            result = fn(normalized)
            logger.info("DNI lookup ok via %s (user=%s)", name, user_id)
            cache.set(cache_key, result.__dict__, CACHE_TTL)
            return result
        except FactilizaError as exc:
            logger.warning("DNI lookup via %s failed: %s", name, exc)
            errors.append(f"{name}: {exc}")
            # 404 de DNI inválido no intenta el otro proveedor (mismo dato)
            if exc.status_code == 404 and len(providers) > 1:
                # igual intentamos fallback por si el primario devolvió error engañoso
                continue
        except requests.RequestException as exc:
            logger.warning("DNI lookup via %s network error: %s", name, exc)
            errors.append(f"{name}: red")

    raise FactilizaError(
        "No se pudo verificar el DNI con los proveedores disponibles. Intenta de nuevo.",
        status_code=502,
    )


def _parse_factiliza_ruc(body: dict, ruc: str) -> RucLookupResult:
    payload = body.get("data") if isinstance(body.get("data"), dict) else body
    legal = (
        payload.get("nombre_o_razon_social")
        or payload.get("razon_social")
        or payload.get("nombre")
        or ""
    ).strip()
    if not legal:
        raise FactilizaError("No se encontraron datos para este RUC.", status_code=404)
    return RucLookupResult(
        ruc=str(payload.get("numero") or payload.get("ruc") or ruc),
        legal_name=legal,
        estado=str(payload.get("estado") or "").strip(),
        condicion=str(payload.get("condicion") or "").strip(),
        provider="factiliza",
    )


def _parse_apiinti_ruc(body: dict, ruc: str) -> RucLookupResult:
    payload = body.get("data") if isinstance(body.get("data"), dict) else body
    legal = (
        payload.get("razonSocial")
        or payload.get("razon_social")
        or payload.get("nombre_o_razon_social")
        or payload.get("nombre")
        or ""
    ).strip()
    if not legal:
        raise FactilizaError("No se encontraron datos para este RUC.", status_code=404)
    return RucLookupResult(
        ruc=str(payload.get("ruc") or payload.get("numero") or ruc),
        legal_name=legal,
        estado=str(payload.get("estado") or "").strip(),
        condicion=str(payload.get("condicion") or "").strip(),
        provider="apiinti",
    )


def _lookup_factiliza_ruc(ruc: str) -> RucLookupResult:
    token = (getattr(settings, "FACTILIZA_API_TOKEN", "") or "").strip()
    if not token:
        raise FactilizaError("Factiliza no configurado.", status_code=503)
    base = getattr(settings, "FACTILIZA_BASE_URL", "https://api.factiliza.com/v1").rstrip(
        "/"
    )
    status_code, body = _request_json(f"{base}/ruc/info/{ruc}", token)
    if status_code >= 400 or body.get("success") is False:
        msg = (
            body.get("message")
            or "No se pudo verificar el RUC. Revisa el número e inténtalo de nuevo."
        )
        raise FactilizaError(str(msg), status_code=status_code)
    return _parse_factiliza_ruc(body, ruc)


def _lookup_apiinti_ruc(ruc: str) -> RucLookupResult:
    token = (getattr(settings, "APIINTI_API_TOKEN", "") or "").strip()
    if not token:
        raise FactilizaError("ApiInti no configurado.", status_code=503)
    base = getattr(settings, "APIINTI_BASE_URL", "https://app.apiinti.dev/api/v1").rstrip(
        "/"
    )
    status_code, body = _request_json(f"{base}/ruc/{ruc}", token)
    if status_code >= 400 or body.get("success") is False:
        msg = (
            body.get("message")
            or body.get("error")
            or "No se pudo verificar el RUC. Revisa el número e inténtalo de nuevo."
        )
        raise FactilizaError(str(msg), status_code=status_code)
    return _parse_apiinti_ruc(body, ruc)


def lookup_ruc(ruc: str, *, user_id: int | None = None) -> RucLookupResult:
    """
    Consulta RUC con redundancia: Factiliza → ApiInti (o mock en desarrollo).
    Cachea el resultado para no consumir 2 créditos al confirmar.
    """
    normalized = validate_ruc(ruc)
    cache_key = f"sunat:ruc:{user_id or 0}:{normalized}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        cached.setdefault("provider", "")
        return RucLookupResult(
            **{
                k: cached[k]
                for k in ("ruc", "legal_name", "estado", "condicion", "provider")
            }
        )

    use_mock = bool(getattr(settings, "FACTILIZA_MOCK", False))
    factiliza_token = (getattr(settings, "FACTILIZA_API_TOKEN", "") or "").strip()
    apiinti_token = (getattr(settings, "APIINTI_API_TOKEN", "") or "").strip()

    if use_mock or (not factiliza_token and not apiinti_token):
        if not use_mock and not factiliza_token and not apiinti_token:
            raise FactilizaError(
                "La verificación de empresa no está configurada "
                "(FACTILIZA_API_TOKEN / APIINTI_API_TOKEN).",
                status_code=503,
            )
        result = _mock_lookup_ruc(normalized)
        cache.set(cache_key, result.__dict__, CACHE_TTL)
        return result

    providers = []
    if factiliza_token:
        providers.append(("factiliza", _lookup_factiliza_ruc))
    if apiinti_token:
        providers.append(("apiinti", _lookup_apiinti_ruc))

    for name, fn in providers:
        try:
            result = fn(normalized)
            logger.info("RUC lookup ok via %s (user=%s)", name, user_id)
            cache.set(cache_key, result.__dict__, CACHE_TTL)
            return result
        except FactilizaError as exc:
            logger.warning("RUC lookup via %s failed: %s", name, exc)
        except requests.RequestException as exc:
            logger.warning("RUC lookup via %s network error: %s", name, exc)

    raise FactilizaError(
        "No se pudo verificar el RUC con los proveedores disponibles. Intenta de nuevo.",
        status_code=502,
    )
