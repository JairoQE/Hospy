"""
Sesiones Hospix en memoria temporal (caché con TTL).
No se persisten mensajes en la base de datos.
"""

from __future__ import annotations

import os
from typing import Any

from django.core.cache import caches

DEFAULT_TTL = int(os.environ.get("HOSPIX_SESSION_TTL", "1800"))  # 30 min
MAX_MESSAGES = int(os.environ.get("HOSPIX_MAX_MESSAGES", "40"))


def _cache():
    try:
        return caches["hospix"]
    except Exception:
        return caches["default"]


def _key(session_id: str) -> str:
    return f"hospix:mem:{session_id}"


def load(session_id: str | None) -> dict[str, Any]:
    if not session_id:
        return _empty()
    data = _cache().get(_key(session_id))
    if isinstance(data, dict):
        return data
    return _empty()


def _empty() -> dict[str, Any]:
    return {
        "flow_state": {"flow_id": None, "flow_step": 0, "flow_data": {}},
        "messages": [],
    }


def save(
    session_id: str,
    *,
    flow_state: dict | None = None,
    messages: list[dict] | None = None,
    ttl: int | None = None,
) -> None:
    current = load(session_id)
    payload = {
        "flow_state": flow_state if flow_state is not None else current["flow_state"],
        "messages": (messages if messages is not None else current["messages"])[
            -MAX_MESSAGES:
        ],
    }
    _cache().set(_key(session_id), payload, ttl or DEFAULT_TTL)


def flow_state(session_id: str | None) -> dict:
    fs = load(session_id).get("flow_state") or {}
    return {
        "flow_id": fs.get("flow_id"),
        "flow_step": int(fs.get("flow_step") or 0),
        "flow_data": fs.get("flow_data") or {},
    }


def history_for_llm(session_id: str | None) -> list[dict]:
    """Historial {role, content} para Gemini/OpenAI."""
    out: list[dict] = []
    for m in load(session_id).get("messages") or []:
        role = m.get("role")
        content = (m.get("content") or m.get("text") or m.get("markdown") or "").strip()
        if role == "user":
            out.append({"role": "user", "content": content})
        elif role in ("hospix", "assistant"):
            out.append({"role": "assistant", "content": content})
    return out[-MAX_MESSAGES:]


def append_turn(
    session_id: str,
    *,
    user_text: str | None = None,
    replies: list[dict] | None = None,
    flow_state: dict | None = None,
) -> None:
    data = load(session_id)
    messages = list(data.get("messages") or [])

    if user_text and user_text.strip():
        messages.append({"role": "user", "content": user_text.strip()})

    for r in replies or []:
        if r.get("role") != "hospix":
            continue
        content = (r.get("markdown") or r.get("text") or "").strip()
        if content:
            messages.append({"role": "hospix", "content": content})

    save(session_id, flow_state=flow_state, messages=messages)


def clear(session_id: str) -> None:
    _cache().delete(_key(session_id))
