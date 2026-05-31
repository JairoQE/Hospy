from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from properties.images import normalize_uploaded_image


def _jpeg_upload(name: str = "foto.jpg") -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new("RGB", (2400, 1600), color=(200, 100, 50)).save(
        buffer, format="JPEG", quality=95
    )
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/jpeg")


@pytest.mark.django_db
def test_normalize_uploaded_image_converts_to_webp():
    upload = _jpeg_upload()
    normalized = normalize_uploaded_image(upload)

    assert normalized.name.endswith(".webp")
    assert normalized.content_type == "image/webp"
    assert normalized.size < upload.size

    img = Image.open(normalized)
    assert img.format == "WEBP"
    assert img.width <= 1920
    assert img.height <= 1920
