"""Interpretación de la ruta SPA para Hospix (404, home, ficha, etc.)."""

from __future__ import annotations

import re

_ACCOMMODATION = re.compile(r"^/hospedajes/(\d+)/?$")
_OWNER_STORE = re.compile(r"^/anfitrion/(\d+)/?$")
_PROFILE = re.compile(r"^/perfil(?:/(\d+))?/?$")
_LEGAL = re.compile(r"^/legal/([^/]+)/?$")


def _norm(pathname: str) -> str:
    path = (pathname or "/").split("?")[0].split("#")[0].rstrip("/")
    return path or "/"


def is_page_location_question(text: str) -> bool:
    lower = (text or "").lower()
    return bool(
        re.search(
            r"(en qu[eé] p[aá]gina|d[oó]nde estoy|p[aá]gina actual|"
            r"qu[eé] ruta|qu[eé] url|what page|where am i|"
            r"en qu[eé] sitio|en qu[eé] parte)",
            lower,
        )
    )


def describe_page(pathname: str) -> dict:
    path = _norm(pathname)

    if path == "/":
        return {
            "kind": "home",
            "label": "Inicio (buscador y exploración)",
            "is_error": False,
        }

    m = _ACCOMMODATION.match(path)
    if m:
        return {
            "kind": "accommodation_detail",
            "label": "Ficha de un hospedaje",
            "accommodation_id": m.group(1),
            "is_error": False,
        }

    if path == "/login":
        return {"kind": "login", "label": "Inicio de sesión", "is_error": False}
    if path.startswith("/registro"):
        return {"kind": "register", "label": "Registro de cuenta", "is_error": False}
    if path.startswith("/recuperar"):
        return {"kind": "password_reset", "label": "Recuperar contraseña", "is_error": False}
    if path == "/mis-reservas":
        return {"kind": "bookings", "label": "Mis reservas", "is_error": False}
    if path == "/bandeja":
        return {"kind": "inbox", "label": "Bandeja de mensajes", "is_error": False}
    if path.startswith("/panel"):
        return {"kind": "owner_panel", "label": "Panel del propietario", "is_error": False}
    if path.startswith("/patrocinio"):
        return {"kind": "sponsor_panel", "label": "Panel de patrocinador", "is_error": False}
    if path.startswith("/admin"):
        return {"kind": "admin_panel", "label": "Panel de administración", "is_error": False}

    m = _OWNER_STORE.match(path)
    if m:
        return {
            "kind": "owner_store",
            "label": "Tienda pública de un anfitrión",
            "owner_id": m.group(1),
            "is_error": False,
        }

    m = _PROFILE.match(path)
    if m:
        return {"kind": "profile", "label": "Perfil de usuario", "is_error": False}

    m = _LEGAL.match(path)
    if m:
        return {"kind": "legal", "label": "Página legal", "is_error": False}

    if path in ("/sobre-nosotros", "/centro-ayuda", "/contacto"):
        labels = {
            "/sobre-nosotros": "Sobre nosotros",
            "/centro-ayuda": "Centro de ayuda",
            "/contacto": "Contacto",
        }
        return {"kind": "info", "label": labels[path], "is_error": False}

    if path.startswith("/hospedajes/"):
        return {
            "kind": "not_found",
            "label": "Página no encontrada (404)",
            "is_error": True,
        }

    return {
        "kind": "not_found",
        "label": "Página no encontrada (404)",
        "is_error": True,
    }


def page_context_snippet(pathname: str) -> str:
    page = describe_page(pathname)
    lines = [
        f"Ruta: {pathname or '/'}",
        f"Tipo de página: {page['kind']}",
        f"Descripción: {page['label']}",
    ]
    if page.get("is_error"):
        lines.append(
            "Es una URL inválida o error 404. No es una ficha de hospedaje ni resultados de búsqueda."
        )
    if page.get("accommodation_id"):
        lines.append(f"ID de hospedaje en la URL: {page['accommodation_id']}")
    return "\n".join(lines)


def reply_page_location(pathname: str, formal: bool) -> str:
    page = describe_page(pathname)
    kind = page["kind"]

    if kind == "not_found":
        return (
            "Se encuentra en una **página no encontrada (404)**. "
            "La dirección que abrió no existe en Hospy. "
            "Puede volver al inicio con el botón de la esquina o escribirme si busca un destino."
            if formal
            else "Estás en una **página no encontrada (404)** 😊 "
            "La URL no existe en Hospy. Pulsa «Volver al inicio» arriba a la derecha "
            "o dime si quieres buscar hospedaje en alguna ciudad."
        )

    labels = {
        "home": ("Está en la **página de inicio** de Hospy, con el buscador y las secciones destacadas.", "Estás en la **página de inicio** de Hospy: buscador, destinos y ofertas."),
        "accommodation_detail": ("Está viendo la **ficha de un hospedaje**.", "Estás en la **ficha de un hospedaje** (detalle con fotos, precio y reserva)."),
        "login": ("Está en la pantalla de **inicio de sesión**.", "Estás en **Iniciar sesión**."),
        "register": ("Está en el formulario de **registro**.", "Estás en **Registrarse**."),
        "bookings": ("Está en **Mis reservas**.", "Estás en **Mis reservas**."),
        "inbox": ("Está en su **bandeja** de mensajes.", "Estás en la **bandeja** de mensajes."),
        "owner_panel": ("Está en el **panel de propietario**.", "Estás en el **panel de propietario**."),
        "admin_panel": ("Está en el **panel de administración**.", "Estás en el **panel de administración**."),
        "owner_store": ("Está en la **tienda pública de un anfitrión**.", "Estás en la **tienda de un anfitrión**."),
        "profile": ("Está en un **perfil de usuario**.", "Estás en un **perfil de usuario**."),
    }
    pair = labels.get(kind)
    if pair:
        return pair[0] if formal else pair[1]
    label = page["label"]
    return (
        f"Se encuentra en: **{label}**."
        if formal
        else f"Estás en: **{label}**."
    )
