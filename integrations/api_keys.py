"""Generación y verificación de API Keys para clientes de integración."""

from __future__ import annotations

import hashlib
import hmac
import secrets


KEY_PREFIX = "hspy_"


def generate_api_key() -> str:
    """Genera una API Key opaca. Solo se muestra una vez al crear/rotar."""
    return f"{KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def key_display_prefix(raw_key: str) -> str:
    """Prefijo visible para identificar la key sin revelarla (ej. hspy_AbCdEfGh)."""
    if not raw_key:
        return ""
    return raw_key[:12]


def keys_match(raw_key: str, key_hash: str) -> bool:
    if not raw_key or not key_hash:
        return False
    return hmac.compare_digest(hash_api_key(raw_key), key_hash)
