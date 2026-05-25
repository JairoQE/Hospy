"""Proveedor LLM para Hospix: Gemini (recomendado) u OpenAI-compatible."""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _llm_flag_on() -> bool:
    return _env("HOSPIX_LLM_ENABLED").lower() in ("true", "1", "yes")


def get_provider() -> str | None:
    """gemini | openai | None"""
    if not _llm_flag_on():
        return None

    explicit = _env("HOSPIX_LLM_PROVIDER").lower()
    gemini_key = _env("GEMINI_API_KEY")
    openai_key = _env("OPENAI_API_KEY")

    if explicit == "gemini" and gemini_key:
        return "gemini"
    if explicit == "openai" and openai_key:
        return "openai"
    if gemini_key:
        return "gemini"
    if openai_key:
        return "openai"
    return None


def llm_enabled() -> bool:
    return get_provider() is not None


def _extract_json(text: str) -> dict | None:
    text = (text or "").strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _normalize_gemini_contents(contents: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in contents:
        role = item.get("role")
        parts = item.get("parts") or []
        text = (parts[0].get("text") if parts else "") or ""
        text = text.strip()
        if not text or role not in ("user", "model"):
            continue
        if normalized and normalized[-1]["role"] == role:
            normalized[-1]["parts"][0]["text"] += "\n" + text
        else:
            normalized.append({"role": role, "parts": [{"text": text}]})
    while normalized and normalized[0]["role"] == "model":
        normalized.pop(0)
    return normalized


def _gemini_models() -> list[str]:
    primary = _env("GEMINI_MODEL", "gemini-2.5-flash-lite")
    fallbacks = _env(
        "GEMINI_MODEL_FALLBACKS",
        "gemini-flash-latest,gemini-2.5-flash,gemini-2.0-flash-lite",
    )
    models = [primary] if primary else []
    for m in fallbacks.split(","):
        m = m.strip()
        if m and m not in models:
            models.append(m)
    return models or ["gemini-2.5-flash-lite"]


def _plain_text_reply(text: str) -> dict:
    clean = (text or "").strip()
    if not clean:
        return {}
    return {
        "markdown": clean,
        "actions": [],
        "chips": [],
        "cards": [],
        "flow_id": None,
        "flow_step": 0,
        "flow_data": {},
    }


def _chat_gemini_plain(
    *,
    api_key: str,
    base: str,
    model: str,
    system_prompt: str,
    contents: list[dict],
) -> dict | None:
    """Respuesta conversacional en texto libre (sin JSON forzado)."""
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.65,
            "maxOutputTokens": 900,
        },
    }
    url = f"{base}/models/{model}:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        candidates = body.get("candidates") or []
        if not candidates:
            return None
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
        return _plain_text_reply(text)
    except urllib.error.HTTPError:
        return None
    except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError):
        return None


def _chat_gemini(
    *,
    system_prompt: str,
    user_message: str,
    history: list[dict],
) -> dict | None:
    api_key = _env("GEMINI_API_KEY")
    if not api_key:
        logger.warning("Hospix Gemini: GEMINI_API_KEY vacía en .env")
        return None

    base = _env(
        "GEMINI_API_BASE",
        "https://generativelanguage.googleapis.com/v1beta",
    ).rstrip("/")

    contents: list[dict] = []
    for h in history[-10:]:
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if not content:
            continue
        gemini_role = "model" if role == "assistant" else "user"
        contents.append({"role": gemini_role, "parts": [{"text": content}]})
    contents.append({"role": "user", "parts": [{"text": user_message}]})
    contents = _normalize_gemini_contents(contents)

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.45,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    for model in _gemini_models():
        url = f"{base}/models/{model}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            candidates = body.get("candidates") or []
            if not candidates:
                logger.warning("Hospix Gemini (%s): sin candidatos — %s", model, body)
                continue
            parts = (candidates[0].get("content") or {}).get("parts") or []
            text = "".join(p.get("text", "") for p in parts)
            parsed = _extract_json(text)
            if parsed and (parsed.get("markdown") or parsed.get("text")):
                return _normalize_llm_payload(parsed)
            plain = _plain_text_reply(text)
            if plain:
                return plain
            logger.warning("Hospix Gemini (%s): respuesta vacía", model)
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")[:500]
            logger.warning("Hospix Gemini HTTP %s (%s): %s", exc.code, model, err_body)
            if exc.code == 429:
                continue
            if exc.code in (400, 404):
                continue
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as exc:
            logger.warning("Hospix Gemini error (%s): %s", model, exc)

        plain = _chat_gemini_plain(
            api_key=api_key,
            base=base,
            model=model,
            system_prompt=system_prompt + "\n\nResponde solo con texto natural (sin JSON).",
            contents=contents,
        )
        if plain:
            return plain

    return None


def _normalize_llm_payload(data: dict) -> dict:
    """Solo texto por defecto; sin botones salvo que el modelo los pida explícitamente."""
    markdown = (data.get("markdown") or data.get("text") or "").strip()
    actions = data.get("actions") or []
    chips = data.get("chips") or []
    cards = data.get("cards") or []
    return {
        "markdown": markdown,
        "actions": actions if isinstance(actions, list) else [],
        "chips": chips if isinstance(chips, list) else [],
        "cards": cards if isinstance(cards, list) else [],
        "flow_id": data.get("flow_id"),
        "flow_step": int(data.get("flow_step") or 0),
        "flow_data": data.get("flow_data") or {},
    }


def _chat_openai(
    *,
    system_prompt: str,
    user_message: str,
    history: list[dict],
) -> dict | None:
    api_key = _env("OPENAI_API_KEY")
    if not api_key:
        return None

    base_url = _env(
        "OPENAI_API_BASE", "https://api.openai.com/v1/chat/completions"
    ).rstrip("/")
    if not base_url.endswith("/chat/completions"):
        if base_url.endswith("/v1"):
            base_url = f"{base_url}/chat/completions"
        else:
            base_url = f"{base_url}/v1/chat/completions"

    model = _env("OPENAI_MODEL", "gpt-4o-mini")

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        role = h.get("role")
        if role in ("user", "assistant") and h.get("content"):
            messages.append({"role": role, "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": model,
        "temperature": 0.4,
        "max_tokens": 1024,
        "messages": messages,
        "response_format": {"type": "json_object"},
    }

    req = urllib.request.Request(
        base_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        return _extract_json(content)
    except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as exc:
        logger.warning("Hospix OpenAI error: %s", exc)
        return None


def chat_completion(
    *,
    system_prompt: str,
    user_message: str,
    history: list[dict],
) -> tuple[dict | None, str | None]:
    """Devuelve (respuesta_json, proveedor)."""
    provider = get_provider()
    if provider == "gemini":
        data = _chat_gemini(
            system_prompt=system_prompt,
            user_message=user_message,
            history=history,
        )
        return data, "gemini" if data else None
    if provider == "openai":
        data = _chat_openai(
            system_prompt=system_prompt,
            user_message=user_message,
            history=history,
        )
        return data, "openai" if data else None
    return None, None


def build_system_prompt(
    *,
    audience: str,
    formal: bool,
    platform: str,
    user_snippet: str,
    pathname: str,
    data_context: str = "",
) -> str:
    tone = (
        "Use «usted» y sea profesional."
        if formal
        else "Use «tú», cercano y amable (pocos emojis: 😊 ✅ 🔍)."
    )
    data_block = f"\n\nDatos en tiempo real de Hospy:\n{data_context}" if data_context else ""

    return f"""Eres Hospix, el asistente virtual de Hospy (Perú). {tone}
Eres conversacional: respondes como un chat de mensajes de **solo texto** (sin imágenes, sin audio, sin archivos).
Personalidad: experto en hospedajes peruanos, cercano, claro y honesto.
Responde en español (Perú). Adapta la longitud a la pregunta (1-6 frases habitualmente).

{platform}

Contexto del visitante:
{user_snippet}

Página actual: {pathname}
Rol del visitante: {audience}
{data_block}

Formato de salida (JSON único):
{{
  "markdown": "tu respuesta aquí (**negrita** permitida, viñetas con - si hace falta)",
  "actions": [],
  "chips": [],
  "cards": [],
  "flow_id": null,
  "flow_step": 0,
  "flow_data": {{}}
}}

Reglas de conversación:
- Prioriza respuesta libre en "markdown". Deja "actions", "chips" y "cards" como [] casi siempre.
- Solo usa "cards" si el usuario busca alojamiento y tienes datos reales en el contexto (máx. 3).
- Respeta el tipo pedido: si buscó "hospedajes", no pongas hoteles; si buscó "hoteles", no pongas hostales.
- No inventes reservas, precios ni fichas. Si no tienes datos, dilo con naturalidad.
- Si preguntan quién eres, preséntate como Hospix (asistente de Hospy), no como humano.
- Preguntas personales, opiniones o charla general: responde con naturalidad y vuelve suavemente a cómo ayudar en Hospy.
- No repitas en cada mensaje la lista de funciones ni botones; conversa primero.
- Rutas internas si las mencionas: /, /mis-reservas, /panel, /bandeja, /login, /centro-ayuda
"""
