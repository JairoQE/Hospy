"""Rutas de medios consistentes para el frontend (proxy /media)."""


def media_public_path(file_field) -> str | None:
    """Devuelve siempre /media/... para usar en API y frontend."""
    if not file_field:
        return None
    url = file_field.url
    if url.startswith("http://") or url.startswith("https://"):
        from urllib.parse import urlparse

        path = urlparse(url).path
    else:
        path = url
    if not path.startswith("/"):
        path = f"/{path}"
    return path
