from unittest.mock import MagicMock

from properties.media_urls import media_public_path


def test_media_public_path_returns_cloudinary_url():
    field = MagicMock()
    field.url = "https://res.cloudinary.com/demo/image/upload/v1/hospedajes/foto.webp"
    assert media_public_path(field) == field.url


def test_media_public_path_strips_localhost_to_media_path():
    field = MagicMock()
    field.url = "http://127.0.0.1:8000/media/hospedajes/foto.webp"
    assert media_public_path(field) == "/media/hospedajes/foto.webp"
