"""Rutas de medios consistentes para el frontend (proxy /media o CDN)."""

from urllib.parse import urlparse

_LOCAL_MEDIA_HOSTS = frozenset(
    {"localhost", "127.0.0.1", "localhost:8000", "127.0.0.1:8000"}
)


def media_public_path(file_field) -> str | None:
    """Devuelve /media/... en local o URL completa en CDN (Cloudinary, R2, S3)."""
    if not file_field:
        return None
    url = file_field.url
    if url.startswith(("http://", "https://")):
        host = urlparse(url).netloc.lower()
        if host in _LOCAL_MEDIA_HOSTS:
            path = urlparse(url).path
            return path if path.startswith("/") else f"/{path}"
        return url
    path = url
    if not path.startswith("/"):
        path = f"/{path}"
    return path
