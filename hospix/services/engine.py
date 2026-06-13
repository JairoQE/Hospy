"""Orquestador Hospix: contexto → LLM (opcional) → reglas. Sesión solo en caché RAM."""

from __future__ import annotations

import re

from hospix import session_store

from . import llm as llm_svc
from . import rules as rules_svc
from .context import (
    build_llm_data_context,
    build_platform_snippet,
    build_user_snippet,
    formal_tone,
    resolve_audience,
)
from .page_context import describe_page, is_page_location_question, reply_page_location


def _parse_db_cards_from_context(data_context: str) -> list[dict]:
    import json

    if not data_context or "verificados en o cerca de" not in data_context:
        return []
    match = re.search(r"\[[\s\S]*\]", data_context)
    if not match:
        return []
    try:
        cards = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    return cards if isinstance(cards, list) else []


def _enrich_card(card: dict, by_id: dict[str, dict], by_name: dict[str, dict]) -> dict:
    cid = str(card.get("id", ""))
    name_key = (card.get("name") or "").strip().lower()
    db = by_id.get(cid) or (by_name.get(name_key) if name_key else None)
    if not db:
        return card
    return {
        **card,
        "id": db.get("id", cid),
        "name": db.get("name") or card.get("name"),
        "location": db.get("location") or card.get("location"),
        "price": db.get("price") or card.get("price"),
        "link": db.get("link") or card.get("link"),
        "image": db.get("image") or card.get("image"),
        "type": db.get("type") or card.get("type"),
        "type_label": db.get("type_label") or card.get("type_label"),
    }


def _merge_stay_cards(
    replies: list[dict],
    data_context: str,
    message: str,
    pathname: str = "",
) -> list[dict]:
    """Inyecta fichas reales de la BD (con foto) en respuestas del LLM."""
    if is_page_location_question(message):
        return replies

    page = describe_page(pathname)
    lower = (message or "").lower()
    if page.get("is_error") and not re.search(
        r"buscar|hospedaje|alojamiento|hotel|hostal|reservar",
        lower,
    ):
        return replies

    if not re.search(
        r"buscar|hospedaje|alojamiento|hotel|hostal|reservar|donde|dónde|ciudad|"
        r"lima|cusco|arequipa|peru|perú|todos|barato|económico|economico",
        lower,
    ):
        return replies

    db_cards = _parse_db_cards_from_context(data_context)
    if not db_cards:
        return replies

    by_id = {str(c.get("id")): c for c in db_cards if c.get("id") is not None}
    by_name = {
        (c.get("name") or "").strip().lower(): c
        for c in db_cards
        if c.get("name")
    }

    out = []
    for r in replies:
        if r.get("role") != "hospix":
            out.append(r)
            continue
        llm_cards = r.get("cards") or []
        if llm_cards:
            merged = [_enrich_card(c, by_id, by_name) for c in llm_cards[:3]]
            out.append({**r, "cards": merged})
        else:
            out.append({**r, "cards": db_cards[:3]})
    return out


def _resolve_history(session_id: str | None, client_history: list[dict]) -> list[dict]:
    """Prioriza historial en caché del servidor; el cliente solo refuerza el turno actual."""
    cached = session_store.history_for_llm(session_id)
    if cached:
        return cached
    return client_history[-session_store.MAX_MESSAGES :]


def _finish_turn(
    sid: str,
    *,
    user_text: str | None,
    replies: list[dict],
    flow_state: dict,
    source: str,
) -> dict:
    session_store.append_turn(
        sid,
        user_text=user_text,
        replies=replies,
        flow_state=flow_state,
    )
    return {
        "session_id": sid,
        "replies": replies,
        "flow_state": flow_state,
        "source": source,
        "ephemeral": True,
    }


def welcome(user, pathname: str, session_id: str | None) -> dict:
    sid = session_id or rules_svc.new_session_id()
    replies, state = rules_svc.welcome_replies(user, pathname)
    session_store.save(sid, flow_state=state, messages=[])
    session_store.append_turn(sid, replies=replies, flow_state=state)
    return {
        "session_id": sid,
        "replies": replies,
        "flow_state": state,
        "ephemeral": True,
    }


def chat(
    *,
    message: str,
    user,
    pathname: str,
    session_id: str | None,
    history: list[dict],
    action_id: str | None = None,
    action_target: str | None = None,
    request=None,
) -> dict:
    from integrations.ipguide import city_search_fallback, lookup_request

    ip_city = None
    if request is not None:
        ip_city = city_search_fallback(lookup_request(request))

    sid = session_id or rules_svc.new_session_id()
    state = session_store.flow_state(sid)
    audience = resolve_audience(user, pathname)
    formal = formal_tone(audience)
    llm_history = _resolve_history(sid, history)

    if action_id:
        result = rules_svc.process_action(
            action_id, action_target, user, pathname, state
        )
        if result:
            replies, next_state, _ = result
            return _finish_turn(
                sid,
                user_text=message or None,
                replies=replies,
                flow_state=next_state,
                source="rules",
            )

    if message.strip() and is_page_location_question(message):
        formal = formal_tone(audience)
        replies = [
            {
                "role": "hospix",
                "markdown": reply_page_location(pathname, formal),
                "actions": [
                    {"id": "home", "label": "Ir al inicio", "type": "navigate", "target": "/"},
                ],
            }
        ]
        return _finish_turn(
            sid,
            user_text=message,
            replies=replies,
            flow_state=rules_svc._empty_state(),
            source="rules",
        )

    if llm_svc.llm_enabled() and message.strip():
        data_context = build_llm_data_context(message, ip_city=ip_city)
        system = llm_svc.build_system_prompt(
            audience=audience,
            formal=formal,
            platform=build_platform_snippet(),
            user_snippet=build_user_snippet(user, audience),
            pathname=pathname,
            data_context=data_context,
        )
        llm_data, provider = llm_svc.chat_completion(
            system_prompt=system,
            user_message=message,
            history=llm_history,
        )
        if llm_data:
            replies = rules_svc.llm_to_replies(llm_data)
            if replies:
                replies = _merge_stay_cards(replies, data_context, message, pathname)
                next_state = {
                    "flow_id": llm_data.get("flow_id"),
                    "flow_step": int(llm_data.get("flow_step") or 0),
                    "flow_data": llm_data.get("flow_data") or {},
                }
                return _finish_turn(
                    sid,
                    user_text=message,
                    replies=replies,
                    flow_state=next_state,
                    source=provider or "llm",
                )

    replies, next_state, _ = rules_svc.process_message(
        message=message,
        user=user,
        pathname=pathname,
        flow_state={
            "flow_id": state.get("flow_id"),
            "flow_step": state.get("flow_step", 0),
            "flow_data": state.get("flow_data") or {},
        },
        ip_city=ip_city,
    )
    return _finish_turn(
        sid,
        user_text=message,
        replies=replies,
        flow_state=next_state,
        source="rules",
    )
